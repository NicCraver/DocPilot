pub mod compress_pdf;
pub mod extra;
pub mod file_util;
pub mod markitdown_util;
pub mod word_template_util;
pub mod word_typeset_util;
pub mod word_smart_doc_util;
pub mod image_util;
pub mod merge_pdf;
pub mod pdf_lopdf_util;
pub mod split_pdf;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../../packages/shared-types/src/generated/")]
pub struct ToolSchema {
    pub id: String,
    pub description: String,
    #[ts(type = "Record<string, unknown>")]
    pub parameters: serde_json::Value,
    pub requires_confirmation: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../../packages/shared-types/src/generated/")]
pub struct ToolInput {
    #[ts(type = "Record<string, unknown>")]
    pub args: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export, export_to = "../../packages/shared-types/src/generated/")]
pub struct ToolOutput {
    #[ts(type = "Record<string, unknown>")]
    pub data: serde_json::Value,
    pub message: String,
}

#[derive(Debug, thiserror::Error, Serialize)]
pub enum ToolError {
    #[error("未找到工具: {0}")]
    NotFound(String),
    #[error("参数错误: {0}")]
    InvalidInput(String),
    #[error("执行失败: {0}")]
    Execution(String),
}

#[async_trait]
pub trait Tool: Send + Sync {
    fn id(&self) -> &str;
    fn schema(&self) -> ToolSchema;
    async fn execute(&self, input: ToolInput) -> Result<ToolOutput, ToolError>;
}

#[derive(Default)]
pub struct ToolRegistry {
    tools: HashMap<String, Box<dyn Tool>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self {
            tools: HashMap::new(),
        }
    }

    pub fn register(&mut self, tool: Box<dyn Tool>) {
        self.tools.insert(tool.id().to_string(), tool);
    }

    pub fn list(&self) -> Vec<ToolSchema> {
        self.tools.values().map(|t| t.schema()).collect()
    }

    pub async fn run(&self, id: &str, input: ToolInput) -> Result<ToolOutput, ToolError> {
        let tool = self
            .tools
            .get(id)
            .ok_or_else(|| ToolError::NotFound(id.to_string()))?;
        tool.execute(input).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ts_rs::TS;

    struct EchoTool;

    #[async_trait::async_trait]
    impl Tool for EchoTool {
        fn id(&self) -> &str {
            "echo"
        }
        fn schema(&self) -> ToolSchema {
            ToolSchema {
                id: "echo".into(),
                description: "回显输入".into(),
                parameters: serde_json::json!({"type": "object"}),
                requires_confirmation: false,
            }
        }
        async fn execute(&self, input: ToolInput) -> Result<ToolOutput, ToolError> {
            Ok(ToolOutput {
                data: input.args,
                message: "ok".into(),
            })
        }
    }

    #[tokio::test]
    async fn registry_runs_registered_tool() {
        let mut reg = ToolRegistry::new();
        reg.register(Box::new(EchoTool));
        let out = reg
            .run("echo", ToolInput { args: serde_json::json!({"x": 1}) })
            .await
            .unwrap();
        assert_eq!(out.message, "ok");
    }

    #[tokio::test]
    async fn registry_unknown_tool_errors() {
        let reg = ToolRegistry::new();
        let err = reg
            .run("missing", ToolInput { args: serde_json::json!({}) })
            .await
            .unwrap_err();
        assert!(matches!(err, ToolError::NotFound(_)));
    }

    #[test]
    fn registry_lists_schemas() {
        let mut reg = ToolRegistry::new();
        reg.register(Box::new(EchoTool));
        let schemas = reg.list();
        assert_eq!(schemas.len(), 1);
        assert_eq!(schemas[0].id, "echo");
    }

    #[test]
    fn export_shared_types_bindings() {
        let cfg = ts_rs::Config::default();
        ToolSchema::export(&cfg).unwrap();
        ToolInput::export(&cfg).unwrap();
        ToolOutput::export(&cfg).unwrap();
    }
}
