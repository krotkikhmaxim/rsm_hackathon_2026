"""
Singleton artifact loader.
Loads 48 CatBoost models and data files once at startup, keeps them in memory.
"""

from pathlib import Path
from .inference import load_artifacts

_artifacts = None


def get_artifacts(base_dir: str | None = None) -> dict:
    global _artifacts
    if _artifacts is None:
        root = Path(base_dir) if base_dir else Path(__file__).resolve().parents[1]
        print(f"[Loader] Loading artifacts from {root}...")
        _artifacts = load_artifacts(base_dir=str(root), debug=True)
        n_24h = len(_artifacts["loaded_models"]["24h"])
        n_7d = len(_artifacts["loaded_models"]["7d"])
        print(f"[Loader] Ready: {n_24h} models (24h), {n_7d} models (7d)")
        print(f"[Loader] Data rows: {len(_artifacts['incidents_data'])}")
        print(f"[Loader] Infra clusters: {_artifacts['infra_clusters']}")
        print(f"[Loader] Threat clusters: {_artifacts['threat_clusters']}")
    return _artifacts
