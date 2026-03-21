"""
EcoSync Configuration Settings
"""
import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class MQTTConfig:
    broker_host: str = os.getenv('MQTT_HOST', 'localhost')
    broker_port: int = int(os.getenv('MQTT_PORT', '1883'))
    username: Optional[str] = os.getenv('MQTT_USER')
    password: Optional[str] = os.getenv('MQTT_PASS')
    keepalive: int = 60


@dataclass
class RedisConfig:
    host: str = os.getenv('REDIS_HOST', 'localhost')
    port: int = int(os.getenv('REDIS_PORT', '6379'))
    db: int = int(os.getenv('REDIS_DB', '0'))
    password: Optional[str] = os.getenv('REDIS_PASS')


@dataclass
class APIConfig:
    host: str = os.getenv('API_HOST', '0.0.0.0')
    port: int = int(os.getenv('API_PORT', '8000'))
    debug: bool = os.getenv('DEBUG', 'false').lower() == 'true'
    cors_origins: list = None
    
    def __post_init__(self):
        if self.cors_origins is None:
            self.cors_origins = ['*']


@dataclass
class SimulatorConfig:
    num_buildings: int = int(os.getenv('NUM_BUILDINGS', '50'))
    telemetry_interval: float = float(os.getenv('TELEMETRY_INTERVAL', '5.0'))
    auto_events: bool = os.getenv('AUTO_EVENTS', 'true').lower() == 'true'
    event_interval: int = int(os.getenv('EVENT_INTERVAL', '60'))


@dataclass
class AIOrchestrationConfig:
    trading_cycle_interval: int = int(os.getenv('TRADING_INTERVAL', '10'))
    enable_negotiation: bool = os.getenv('ENABLE_NEGOTIATION', 'true').lower() == 'true'
    min_trade_amount: float = 1.0
    max_trade_amount: float = 100.0


@dataclass
class BlockchainConfig:
    rpc_url: str = os.getenv('BLOCKCHAIN_RPC', 'http://localhost:8545')
    contract_address: Optional[str] = os.getenv('CONTRACT_ADDRESS')
    private_key: Optional[str] = os.getenv('BLOCKCHAIN_KEY')
    chain_id: int = int(os.getenv('CHAIN_ID', '1337'))


# Global config instances
mqtt_config = MQTTConfig()
redis_config = RedisConfig()
api_config = APIConfig()
simulator_config = SimulatorConfig()
ai_config = AIOrchestrationConfig()
blockchain_config = BlockchainConfig()
