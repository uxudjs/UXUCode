import sys
from importlib.metadata import version
from pathlib import Path


mflm_root = (
    Path(__file__).resolve().parents[3]
    / "Competitions"
    / "MingZhen"
    / "FakeShield-main"
    / "MFLM"
).resolve()
assert (mflm_root / "mmdet").is_dir()
sys.path.insert(0, str(mflm_root))

import cv2
import deepspeed
import gradio
import lmdb
import mmcv
import mmdet
import numpy
import pandas
import torch
import transformers
import wandb
from mmcv.ops import nms


assert version("mmcv-full") == "1.4.7"
assert version("deepspeed") == "0.12.5"
assert version("transformers") == "4.28.0"
assert version("tokenizers") == "0.13.3"
assert version("wandb") == "0.16.1"
assert torch.__version__ == "1.13.0+cu116"
assert torch.version.cuda == "11.6"
assert torch.cuda.is_available()

boxes = torch.tensor(
    [[0.0, 0.0, 10.0, 10.0], [1.0, 1.0, 9.0, 9.0], [20.0, 20.0, 30.0, 30.0]],
    device="cuda",
)
scores = torch.tensor([0.9, 0.8, 0.7], device="cuda")
detections, keep = nms(boxes, scores, 0.5)

assert detections.is_cuda
assert keep.is_cuda
assert keep.tolist() == [0, 2]

print(
    {
        "mmcv_full": version("mmcv-full"),
        "mmcv": mmcv.__version__,
        "mmdet": mmdet.__version__,
        "deepspeed": deepspeed.__version__,
        "transformers": transformers.__version__,
        "torch": torch.__version__,
        "device": torch.cuda.get_device_name(0),
        "capability": torch.cuda.get_device_capability(0),
        "cuda_nms_keep": keep.tolist(),
        "cv2": cv2.__version__,
        "gradio": gradio.__version__,
        "lmdb": lmdb.__version__,
        "numpy": numpy.__version__,
        "pandas": pandas.__version__,
        "wandb": wandb.__version__,
    }
)
