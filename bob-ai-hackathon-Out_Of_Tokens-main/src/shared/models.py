"""
src/shared/models.py
Single source of truth for all shared domain types used across every module.
DO NOT redefine these in individual modules — import from here.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class VesselClass(str, Enum):
    SMALL = "SMALL"      # < 5,000 TEU
    MEDIUM = "MEDIUM"    # 5,000–10,000 TEU
    LARGE = "LARGE"      # 10,000–15,000 TEU
    VLARGE = "VLARGE"    # > 15,000 TEU (Very Large Container Ship)


class Priority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class BerthStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    OCCUPIED = "OCCUPIED"
    MAINTENANCE = "MAINTENANCE"


@dataclass
class Vessel:
    vessel_id: str
    name: str
    vessel_class: VesselClass
    cargo_volume_teu: int          # TEU (twenty-foot equivalent units)
    eta: float                     # Unix timestamp (seconds)
    priority: Priority
    assigned_berth_id: Optional[str] = None
    assigned_crane_ids: list = field(default_factory=list)
    arrival_time: Optional[float] = None   # actual arrival (set post-simulation)
    service_start: Optional[float] = None
    service_end: Optional[float] = None
    wait_time_hours: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "vessel_id": self.vessel_id,
            "name": self.name,
            "vessel_class": self.vessel_class.value,
            "cargo_volume_teu": self.cargo_volume_teu,
            "eta": self.eta,
            "priority": self.priority.value,
            "assigned_berth_id": self.assigned_berth_id,
            "assigned_crane_ids": self.assigned_crane_ids,
            "arrival_time": self.arrival_time,
            "service_start": self.service_start,
            "service_end": self.service_end,
            "wait_time_hours": self.wait_time_hours,
        }


@dataclass
class Berth:
    berth_id: str
    name: str
    compatible_classes: list          # list of VesselClass values this berth supports
    max_cranes: int                   # max simultaneous cranes that can work this berth
    status: BerthStatus = BerthStatus.AVAILABLE
    current_vessel_id: Optional[str] = None
    available_from: float = 0.0       # Unix timestamp when berth next becomes free

    def to_dict(self) -> dict:
        return {
            "berth_id": self.berth_id,
            "name": self.name,
            "compatible_classes": [c if isinstance(c, str) else c.value for c in self.compatible_classes],
            "max_cranes": self.max_cranes,
            "status": self.status.value,
            "current_vessel_id": self.current_vessel_id,
            "available_from": self.available_from,
        }


@dataclass
class Crane:
    crane_id: str
    name: str
    throughput_teu_per_hour: float    # TEUs unloaded per hour
    assigned_berth_id: Optional[str] = None
    available_from: float = 0.0       # Unix timestamp when crane next becomes free

    def to_dict(self) -> dict:
        return {
            "crane_id": self.crane_id,
            "name": self.name,
            "throughput_teu_per_hour": self.throughput_teu_per_hour,
            "assigned_berth_id": self.assigned_berth_id,
            "available_from": self.available_from,
        }
