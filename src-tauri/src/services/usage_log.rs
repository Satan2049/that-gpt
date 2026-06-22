use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};

use crate::error::AppError;
use crate::models::api::TokenUsage;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageLogEntry {
    pub timestamp: String,
    pub conversation_id: String,
    pub message_id: String,
    pub model: String,
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageDaySummary {
    pub date: String,
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub total_tokens: u64,
    pub request_count: u32,
}

pub struct UsageLogService;

impl UsageLogService {
    pub fn log_path(data_dir: &Path) -> PathBuf {
        data_dir.join("usage_log.jsonl")
    }

    pub fn append(
        data_dir: &Path,
        conversation_id: &str,
        message_id: &str,
        model: &str,
        usage: &TokenUsage,
    ) -> Result<(), AppError> {
        let path = Self::log_path(data_dir);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| AppError::Internal(e.to_string()))?;
        }

        let entry = UsageLogEntry {
            timestamp: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
            conversation_id: conversation_id.to_string(),
            message_id: message_id.to_string(),
            model: model.to_string(),
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
        };

        let line = serde_json::to_string(&entry).map_err(|e| AppError::Internal(e.to_string()))?;
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)
            .map_err(|e| AppError::Internal(e.to_string()))?;
        writeln!(file, "{line}").map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(())
    }

    pub fn summarize(data_dir: &Path, days: u32) -> Result<Vec<UsageDaySummary>, AppError> {
        let path = Self::log_path(data_dir);
        if !path.exists() {
            return Ok(Vec::new());
        }

        let cutoff = chrono::Utc::now() - chrono::Duration::days(days as i64);
        let file = fs::File::open(&path).map_err(|e| AppError::Internal(e.to_string()))?;
        let reader = BufReader::new(file);

        let mut by_day: std::collections::BTreeMap<String, UsageDaySummary> =
            std::collections::BTreeMap::new();

        for line in reader.lines() {
            let line = line.map_err(|e| AppError::Internal(e.to_string()))?;
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            let entry: UsageLogEntry =
                serde_json::from_str(trimmed).map_err(|e| AppError::Internal(e.to_string()))?;
            let parsed = chrono::DateTime::parse_from_rfc3339(&entry.timestamp)
                .map(|dt| dt.with_timezone(&chrono::Utc))
                .unwrap_or_else(|_| chrono::Utc::now());
            if parsed < cutoff {
                continue;
            }
            let date = parsed.format("%Y-%m-%d").to_string();
            let summary = by_day.entry(date.clone()).or_insert(UsageDaySummary {
                date,
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
                request_count: 0,
            });
            summary.prompt_tokens += entry.prompt_tokens as u64;
            summary.completion_tokens += entry.completion_tokens as u64;
            summary.total_tokens += entry.total_tokens as u64;
            summary.request_count += 1;
        }

        Ok(by_day.into_values().collect())
    }
}
