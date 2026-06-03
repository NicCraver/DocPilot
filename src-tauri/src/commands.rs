use crate::tools::{compress_pdf::CompressPdf, ToolInput, ToolOutput, ToolRegistry, ToolSchema};
use tauri::State;

pub fn build_registry() -> ToolRegistry {
    let mut reg = ToolRegistry::new();
    reg.register(Box::new(CompressPdf));
    reg
}

pub struct AppState {
    pub registry: ToolRegistry,
}

#[tauri::command]
pub fn list_tools(state: State<'_, AppState>) -> Vec<ToolSchema> {
    state.registry.list()
}

#[tauri::command]
pub async fn run_tool(
    state: State<'_, AppState>,
    id: String,
    input: ToolInput,
) -> Result<ToolOutput, String> {
    state
        .registry
        .run(&id, input)
        .await
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_registry_contains_compress_pdf() {
        let reg = build_registry();
        let ids: Vec<String> = reg.list().into_iter().map(|s| s.id).collect();
        assert!(ids.contains(&"compress_pdf".to_string()));
    }
}
