use crate::models::api::ModelInfo;

#[derive(Debug, Clone, Copy)]
struct ModelLimits {
    context_window: u32,
    max_output_tokens: u32,
}

pub fn infer_model_infos(models: &[String]) -> Vec<ModelInfo> {
    models.iter().map(|id| infer_one(id)).collect()
}

pub fn infer_one(model_id: &str) -> ModelInfo {
    let lower = model_id.to_lowercase();
    let embedding = detects_embedding(&lower);
    let audio = !embedding && detects_audio(&lower);
    let image_gen = !embedding && !audio && detects_image_gen(&lower);
    let limits = if embedding || image_gen {
        ModelLimits {
            context_window: if image_gen { 4_096 } else { 8_192 },
            max_output_tokens: if image_gen { 0 } else { 0 },
        }
    } else {
        lookup_limits(&lower)
    };
    let reasoning = !embedding && !audio && !image_gen && detects_reasoning(&lower);
    let vision = !embedding && !audio && !image_gen && detects_vision(&lower);
    let tools = !embedding && !audio && !image_gen && detects_tools(&lower, reasoning);

    ModelInfo {
        id: model_id.to_string(),
        vision,
        tools,
        reasoning,
        embedding,
        audio,
        image_gen,
        context_window: limits.context_window,
        max_output_tokens: limits.max_output_tokens,
    }
}

fn detects_embedding(lower: &str) -> bool {
    lower.contains("embed")
        || lower.contains("nomic-embed")
        || lower.contains("bge-")
        || lower.contains("e5-")
        || lower.contains("mxbai-embed")
}

fn detects_audio(lower: &str) -> bool {
    lower.contains("whisper")
        || lower.contains("tts")
        || lower.contains("bark")
        || lower.contains("parler")
        || lower.contains("audio")
        || lower.contains("speech")
}

fn detects_image_gen(lower: &str) -> bool {
    lower.contains("gpt-image")
        || lower.contains("dall-e")
        || lower.contains("dalle")
        || lower.contains("stable-diffusion")
        || lower.contains("stable_diffusion")
        || lower.contains("flux")
        || lower.contains("sdxl")
        || lower.contains("imagen")
}

fn detects_reasoning(lower: &str) -> bool {
    lower.contains("o1")
        || lower.contains("o3")
        || lower.contains("o4")
        || lower.contains("deepseek-r1")
        || lower.contains("qwq")
        || lower.contains("reasoning")
        || lower.contains("think")
        || lower.contains("r1-distill")
        || lower.contains("qwen3")
        || lower.contains("magistral")
}

fn detects_vision(lower: &str) -> bool {
    lower.contains("vision")
        || lower.contains("4o")
        || lower.contains("llava")
        || lower.contains("bakllava")
        || lower.contains("moondream")
        || lower.contains("pixtral")
        || lower.contains("gemini")
        || lower.contains("claude-3")
        || lower.contains("claude-4")
        || lower.contains("qwen-vl")
        || lower.contains("qwen2-vl")
        || lower.contains("minicpm-v")
        || lower.contains("phi-3-vision")
        || lower.contains("gpt-4-turbo")
}

fn detects_tools(lower: &str, reasoning: bool) -> bool {
    if lower.contains("embed")
        || lower.contains("whisper")
        || lower.contains("nomic")
        || lower.contains("tts")
        || lower.contains("dall-e")
        || lower.contains("gpt-image")
        || lower.contains("stable-diffusion")
        || lower.contains("flux")
    {
        return false;
    }
    if reasoning && (lower.contains("o1-mini") || lower.starts_with("o1-")) {
        return false;
    }
    true
}

fn lookup_limits(lower: &str) -> ModelLimits {
    if lower.contains("gpt-4o-mini") {
        return ModelLimits {
            context_window: 128_000,
            max_output_tokens: 16_384,
        };
    }
    if lower.contains("gpt-4o") || lower.contains("gpt-4-turbo") {
        return ModelLimits {
            context_window: 128_000,
            max_output_tokens: 16_384,
        };
    }
    if lower.contains("o1") || lower.contains("o3") {
        return ModelLimits {
            context_window: 200_000,
            max_output_tokens: 100_000,
        };
    }
    if lower.contains("gpt-4") {
        return ModelLimits {
            context_window: 8_192,
            max_output_tokens: 4_096,
        };
    }
    if lower.contains("gpt-3.5") {
        return ModelLimits {
            context_window: 16_385,
            max_output_tokens: 4_096,
        };
    }
    if lower.contains("claude-3") || lower.contains("claude-4") {
        return ModelLimits {
            context_window: 200_000,
            max_output_tokens: 8_192,
        };
    }
    if lower.contains("gemini-1.5-pro") || lower.contains("gemini-2") {
        return ModelLimits {
            context_window: 1_000_000,
            max_output_tokens: 8_192,
        };
    }
    if lower.contains("gemini") {
        return ModelLimits {
            context_window: 1_000_000,
            max_output_tokens: 8_192,
        };
    }
    if lower.contains("llama3.1") || lower.contains("llama3.2") || lower.contains("llama3.3") {
        return ModelLimits {
            context_window: 128_000,
            max_output_tokens: 4_096,
        };
    }
    if lower.contains("llama3") {
        return ModelLimits {
            context_window: 8_192,
            max_output_tokens: 4_096,
        };
    }
    if lower.contains("llama2") {
        return ModelLimits {
            context_window: 4_096,
            max_output_tokens: 2_048,
        };
    }
    if lower.contains("mistral-large") || lower.contains("mixtral") {
        return ModelLimits {
            context_window: 128_000,
            max_output_tokens: 4_096,
        };
    }
    if lower.contains("mistral") || lower.contains("ministral") {
        return ModelLimits {
            context_window: 32_768,
            max_output_tokens: 4_096,
        };
    }
    if lower.contains("deepseek-r1") || lower.contains("deepseek-v3") {
        return ModelLimits {
            context_window: 64_000,
            max_output_tokens: 8_192,
        };
    }
    if lower.contains("qwen2.5") || lower.contains("qwen3") {
        return ModelLimits {
            context_window: 128_000,
            max_output_tokens: 8_192,
        };
    }
    if lower.contains("qwen") {
        return ModelLimits {
            context_window: 32_768,
            max_output_tokens: 4_096,
        };
    }
    ModelLimits {
        context_window: 128_000,
        max_output_tokens: 4_096,
    }
}

pub fn format_token_count(value: u32) -> String {
    if value >= 1_000_000 {
        format!("{:.1}M", value as f64 / 1_000_000.0)
    } else if value >= 1_000 {
        format!("{}K", (value as f64 / 1_000.0).round() as u32)
    } else {
        value.to_string()
    }
}

pub fn model_supports_vision(model_id: &str) -> bool {
    infer_one(model_id).vision
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_reasoning_models() {
        assert!(infer_one("o1-preview").reasoning);
        assert!(infer_one("deepseek-r1").reasoning);
        assert!(!infer_one("gpt-4o-mini").reasoning);
    }

    #[test]
    fn detects_vision_models() {
        assert!(infer_one("gpt-4o").vision);
        assert!(infer_one("llava:13b").vision);
        assert!(!infer_one("llama3.2").vision);
    }

    #[test]
    fn detects_image_gen_separate_from_vision() {
        assert!(infer_one("gpt-image-1").image_gen);
        assert!(infer_one("dall-e-3").image_gen);
        assert!(!infer_one("gpt-image-1").vision);
        assert!(!infer_one("dall-e-3").vision);
    }

    #[test]
    fn detects_embedding_and_audio_models() {
        assert!(infer_one("nomic-embed-text").embedding);
        assert!(infer_one("whisper-large").audio);
        assert!(!infer_one("nomic-embed-text").tools);
    }

    #[test]
    fn assigns_context_limits() {
        let info = infer_one("gpt-4o-mini");
        assert_eq!(info.context_window, 128_000);
        assert_eq!(info.max_output_tokens, 16_384);
    }
}
