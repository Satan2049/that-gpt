use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use crate::error::AppError;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelPrice {
    pub input_per_million: f64,
    pub output_per_million: f64,
}

pub struct ModelPriceService;

impl ModelPriceService {
    pub fn path(data_dir: &Path) -> PathBuf {
        data_dir.join("model_prices.json")
    }

    pub fn load(data_dir: &Path) -> Result<HashMap<String, ModelPrice>, AppError> {
        let path = Self::path(data_dir);
        if !path.exists() {
            return Ok(default_prices());
        }
        let raw = fs::read_to_string(&path).map_err(|e| AppError::Internal(e.to_string()))?;
        serde_json::from_str(&raw).map_err(|e| AppError::Internal(e.to_string()))
    }

    pub fn save(data_dir: &Path, prices: &HashMap<String, ModelPrice>) -> Result<(), AppError> {
        let path = Self::path(data_dir);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| AppError::Internal(e.to_string()))?;
        }
        let json = serde_json::to_string_pretty(prices)
            .map_err(|e| AppError::Internal(e.to_string()))?;
        fs::write(&path, json).map_err(|e| AppError::Internal(e.to_string()))
    }
}

fn default_prices() -> HashMap<String, ModelPrice> {
    let mut map = HashMap::new();
    map.insert(
        "gpt-4o-mini".to_string(),
        ModelPrice {
            input_per_million: 0.15,
            output_per_million: 0.60,
        },
    );
    map.insert(
        "gpt-4o".to_string(),
        ModelPrice {
            input_per_million: 2.50,
            output_per_million: 10.0,
        },
    );
    map
}

pub fn estimate_cost(
    prices: &HashMap<String, ModelPrice>,
    model: &str,
    prompt_tokens: u32,
    completion_tokens: u32,
) -> Option<f64> {
    let price = prices.get(model).or_else(|| {
        prices
            .iter()
            .find(|(key, _)| model.contains(key.as_str()))
            .map(|(_, v)| v)
    })?;
    let input = (prompt_tokens as f64 / 1_000_000.0) * price.input_per_million;
    let output = (completion_tokens as f64 / 1_000_000.0) * price.output_per_million;
    Some(input + output)
}
