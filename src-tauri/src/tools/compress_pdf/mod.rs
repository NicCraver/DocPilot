use crate::tools::{Tool, ToolError, ToolInput, ToolOutput, ToolSchema};
use async_trait::async_trait;
use serde::Deserialize;

pub struct CompressPdf;

#[derive(Deserialize)]
struct Args {
    input_path: String,
    output_path: String,
}

#[async_trait]
impl Tool for CompressPdf {
    fn id(&self) -> &str {
        "compress_pdf"
    }

    fn schema(&self) -> ToolSchema {
        ToolSchema {
            id: "compress_pdf".into(),
            description: "压缩 PDF 文件（无损结构压缩：对象流 + 交叉引用流）。输入 input_path 与 output_path。"
                .into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "input_path": { "type": "string", "description": "源 PDF 路径" },
                    "output_path": { "type": "string", "description": "输出 PDF 路径" }
                },
                "required": ["input_path", "output_path"]
            }),
            requires_confirmation: false,
        }
    }

    async fn execute(&self, input: ToolInput) -> Result<ToolOutput, ToolError> {
        let args: Args = serde_json::from_value(input.args)
            .map_err(|e| ToolError::InvalidInput(e.to_string()))?;

        let before_size = std::fs::metadata(&args.input_path)
            .map_err(|e| ToolError::Execution(format!("读取源文件失败: {e}")))?
            .len();

        let mut doc = lopdf::Document::load(&args.input_path)
            .map_err(|e| ToolError::Execution(format!("加载 PDF 失败: {e}")))?;

        let mut out_file = std::fs::File::create(&args.output_path)
            .map_err(|e| ToolError::Execution(format!("创建输出文件失败: {e}")))?;
        doc.save_modern(&mut out_file)
            .map_err(|e| ToolError::Execution(format!("保存压缩 PDF 失败: {e}")))?;

        let after_size = std::fs::metadata(&args.output_path)
            .map_err(|e| ToolError::Execution(format!("读取输出文件失败: {e}")))?
            .len();

        Ok(ToolOutput {
            data: serde_json::json!({
                "output_path": args.output_path,
                "before_size": before_size,
                "after_size": after_size,
            }),
            message: format!("已压缩：{before_size} → {after_size} 字节"),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tools::{Tool, ToolInput};
    use lopdf::dictionary;

    fn write_sample_pdf(path: &std::path::Path) {
        let mut doc = lopdf::Document::with_version("1.4");
        let pages_id = doc.new_object_id();
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
        });
        let pages = dictionary! {
            "Type" => "Pages",
            "Kids" => vec![page_id.into()],
            "Count" => 1,
        };
        doc.objects.insert(pages_id, lopdf::Object::Dictionary(pages));
        let catalog_id = doc.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        });
        doc.trailer.set("Root", catalog_id);
        doc.save(path).unwrap();
    }

    #[tokio::test]
    async fn compress_produces_loadable_output_and_reports_sizes() {
        let dir = tempfile::tempdir().unwrap();
        let input = dir.path().join("in.pdf");
        let output = dir.path().join("out.pdf");
        write_sample_pdf(&input);

        let tool = CompressPdf;
        let args = serde_json::json!({
            "input_path": input.to_str().unwrap(),
            "output_path": output.to_str().unwrap(),
        });
        let out = tool.execute(ToolInput { args }).await.unwrap();

        assert!(output.exists());
        lopdf::Document::load(&output).unwrap();
        assert!(out.data.get("before_size").is_some());
        assert!(out.data.get("after_size").is_some());
    }

    #[tokio::test]
    async fn compress_missing_input_errors() {
        let tool = CompressPdf;
        let args = serde_json::json!({
            "input_path": "/nonexistent/x.pdf",
            "output_path": "/tmp/out.pdf",
        });
        let err = tool.execute(ToolInput { args }).await.unwrap_err();
        assert!(matches!(
            err,
            crate::tools::ToolError::Execution(_) | crate::tools::ToolError::InvalidInput(_)
        ));
    }
}
