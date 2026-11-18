# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Provider-neutral wiring: dedicated memory models, optional nodes, detector node."""

from types import SimpleNamespace

import pytest

from artemis.config.llm import LLMConfig, _expand_default_into_nodes

OPENAI_DEFAULT = {
    "provider": "openai",
    "model": "gw-main",
    "fallback": {"provider": "openai", "model": "gw-fallback"},
}


def _llm_config(nodes: dict | None = None) -> LLMConfig:
    raw = {"default": OPENAI_DEFAULT}
    if nodes is not None:
        raw["nodes"] = nodes
    return LLMConfig.model_validate(_expand_default_into_nodes(raw))


def test_expand_materialises_optional_nodes_only_when_overridden():
    plain = _expand_default_into_nodes({"default": OPENAI_DEFAULT})
    for node in ("planner_validation", "validator_pixel_safety_net", "history_analyzer"):
        assert node not in plain

    cfg = _llm_config({"planner_validation": {"model": "gw-judge", "temperature": 0.0}})
    node = cfg.get_agent("planner_validation")
    assert (node.provider, node.model, node.temperature) == ("openai", "gw-judge", 0.0)
    assert node.fallback.model == "gw-fallback"
    # Untouched optional nodes keep their built-in defaults.
    assert cfg.get_agent("validator_pixel_safety_net").provider == "google"


def test_utils_node_is_resolved_from_utils_section():
    cfg = _llm_config({"object_detector": {"model": "gw-detector"}})
    assert cfg.get_utils("object_detector").model == "gw-detector"
    # The detector is a utils node, not an agent node.
    with pytest.raises(AttributeError):
        cfg.get_agent("object_detector")


def test_get_dedicated_llm_routes_by_provider(monkeypatch):
    from artemis.llm.router import ModelProvider
    from artemis.services import llm as llm_service

    google_calls, built = [], []
    monkeypatch.setattr(
        llm_service,
        "get_google_llm",
        lambda **kw: google_calls.append(kw) or "google-model",
    )
    monkeypatch.setattr(
        llm_service.ModelFactory,
        "create_model",
        staticmethod(lambda ep: built.append(ep) or "gateway-model"),
    )

    assert llm_service.get_dedicated_llm("gemini-x", None, temperature=0.0) == "google-model"
    assert llm_service.get_dedicated_llm("gemini-x", "google") == "google-model"
    assert [c["model_name"] for c in google_calls] == ["gemini-x", "gemini-x"]

    assert llm_service.get_dedicated_llm("gw-main", "openai", temperature=0.0) == "gateway-model"
    assert built[0].provider == ModelProvider.OPENAI
    assert built[0].model_name == "gw-main"


def test_capsule_lens_builds_models_with_configured_provider(monkeypatch):
    from artemis.memory.chunking import StepCapsuleLens
    from artemis.services import llm as llm_service

    calls = []
    monkeypatch.setattr(
        llm_service,
        "get_dedicated_llm",
        lambda model, provider=None, **kw: calls.append((model, provider)) or object(),
    )
    lens = StepCapsuleLens(
        "gw-main", provider="openai", fallback_model_name="gw-fb", fallback_provider="openai"
    )
    lens._get_llm()
    lens._get_fallback_llm()
    assert calls == [("gw-main", "openai"), ("gw-fb", "openai")]


def test_capsule_lens_same_model_on_other_provider_keeps_fallback():
    from artemis.memory.chunking import StepCapsuleLens

    same = StepCapsuleLens(
        "m", provider="openai", fallback_model_name="m", fallback_provider="openai"
    )
    assert not same.has_fallback
    other = StepCapsuleLens(
        "m", provider="openai", fallback_model_name="m", fallback_provider="google"
    )
    assert other.has_fallback


@pytest.mark.asyncio
async def test_object_detector_requests_the_utils_node(monkeypatch):
    from artemis.agents.object_detector import object_detector as od

    seen = {}

    def fake_get_llm(ctx, name, **kwargs):
        seen.update(name=name, **kwargs)
        return object()

    async def fake_detect(*args, **kwargs):
        return []

    monkeypatch.setattr(od, "get_llm", fake_get_llm)
    monkeypatch.setattr(od, "_detect_single_label", fake_detect)

    result = await od._run_object_detection(
        SimpleNamespace(llm_config=None), image_bytes=b"x", queries=["Wi-Fi"]
    )
    assert seen == {"name": "object_detector", "is_utils": True}
    assert result["failed"] == ["Wi-Fi"]


@pytest.mark.parametrize(
    ("llm_providers", "summarizer", "chunking", "expected"),
    [
        ("openai", "openai", "openai", False),
        ("openai", "google", "openai", True),
        ("openai", "openai", "google", True),
    ],
)
def test_prewarm_only_when_a_google_model_is_configured(
    monkeypatch, llm_providers, summarizer, chunking, expected
):
    import artemis.config as config_pkg
    import artemis.config.llm as llm_cfg_mod
    from artemis.sdk.agent import Agent

    default = {**OPENAI_DEFAULT, "provider": llm_providers}
    default["fallback"] = {**OPENAI_DEFAULT["fallback"], "provider": llm_providers}
    cfg = LLMConfig.model_validate(_expand_default_into_nodes({"default": default}))
    monkeypatch.setattr(llm_cfg_mod, "get_default_llm_config", lambda: cfg)
    monkeypatch.setattr(
        config_pkg,
        "load_agent_config",
        lambda: SimpleNamespace(
            flash=SimpleNamespace(step_summarizer=SimpleNamespace(provider=summarizer)),
            memory=SimpleNamespace(chunking=SimpleNamespace(provider=chunking)),
        ),
    )
    assert Agent._config_uses_google() is expected
