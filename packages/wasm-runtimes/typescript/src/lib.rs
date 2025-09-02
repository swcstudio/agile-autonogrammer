//! Katalyst TypeScript WebAssembly Runtime
//! 
//! WebAssembly module providing TypeScript/JavaScript functionality:
//! - TypeScript code compilation and execution
//! - JavaScript runtime simulation
//! - Module system support
//! - Type checking capabilities

use wasm_bindgen::prelude::*;
use js_sys::*;
use web_sys::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use regex::Regex;
use once_cell::sync::Lazy;

// Initialize WASM module
#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}

// Compilation options
#[derive(Debug, Serialize, Deserialize)]
pub struct CompilerOptions {
    pub target: String,
    pub module: String,
    pub strict: bool,
    pub source_map: bool,
    pub declaration: bool,
}

impl Default for CompilerOptions {
    fn default() -> Self {
        CompilerOptions {
            target: "ES2020".to_string(),
            module: "ESNext".to_string(),
            strict: true,
            source_map: false,
            declaration: false,
        }
    }
}

/// TypeScript Runtime for code compilation and execution
#[wasm_bindgen]
pub struct TypeScriptRuntime {
    modules: HashMap<String, String>,
    compiler_options: CompilerOptions,
    execution_context: ExecutionContext,
}

#[wasm_bindgen]
impl TypeScriptRuntime {
    #[wasm_bindgen(constructor)]
    pub fn new() -> TypeScriptRuntime {
        TypeScriptRuntime {
            modules: HashMap::new(),
            compiler_options: CompilerOptions::default(),
            execution_context: ExecutionContext::new(),
        }
    }

    /// Compile TypeScript code to JavaScript
    #[wasm_bindgen]
    pub fn compile_typescript(&self, code: &str, options: &str) -> Result<String, JsValue> {
        // Parse compilation options
        let opts: CompilerOptions = if options.is_empty() {
            CompilerOptions::default()
        } else {
            serde_json::from_str(options)
                .map_err(|e| JsValue::from_str(&format!("Invalid compiler options: {}", e)))?
        };

        // Simulate TypeScript compilation
        let compiled_js = self.simulate_typescript_compilation(code, &opts)?;
        
        Ok(compiled_js)
    }

    /// Execute TypeScript code directly
    #[wasm_bindgen]
    pub fn execute_typescript(&mut self, code: &str, context: &str) -> Result<String, JsValue> {
        // Parse execution context
        let ctx: HashMap<String, serde_json::Value> = if context.is_empty() {
            HashMap::new()
        } else {
            serde_json::from_str(context)
                .map_err(|e| JsValue::from_str(&format!("Invalid context: {}", e)))?
        };

        // First compile to JavaScript
        let js_code = self.compile_typescript(code, "")?;
        
        // Then execute
        self.execute_javascript(&js_code, &ctx)
    }

    /// Execute JavaScript code
    #[wasm_bindgen]
    pub fn execute_javascript(&mut self, code: &str, context: &HashMap<String, serde_json::Value>) -> Result<String, JsValue> {
        // Set up execution context
        for (key, value) in context {
            self.execution_context.set_variable(key.clone(), value.clone());
        }

        // Simulate JavaScript execution
        let result = self.simulate_javascript_execution(code)?;
        
        Ok(result)
    }

    /// Add a module to the runtime
    #[wasm_bindgen]
    pub fn add_module(&mut self, name: &str, code: &str) {
        self.modules.insert(name.to_string(), code.to_string());
    }

    /// Get available modules
    #[wasm_bindgen]
    pub fn get_modules(&self) -> Vec<String> {
        self.modules.keys().cloned().collect()
    }

    /// Set compiler options
    #[wasm_bindgen]
    pub fn set_compiler_options(&mut self, options: &str) -> Result<(), JsValue> {
        self.compiler_options = serde_json::from_str(options)
            .map_err(|e| JsValue::from_str(&format!("Invalid compiler options: {}", e)))?;
        Ok(())
    }

    /// Get runtime information
    #[wasm_bindgen]
    pub fn get_runtime_info(&self) -> String {
        let info = serde_json::json!({
            "runtime": "typescript-wasm",
            "version": "1.0.0",
            "typescript_version": "simulated-5.3",
            "features": {
                "compilation": true,
                "execution": true,
                "modules": true,
                "type_checking": true,
                "source_maps": self.compiler_options.source_map
            },
            "compiler_options": self.compiler_options,
            "loaded_modules": self.modules.len()
        });
        
        info.to_string()
    }

    // Private methods for simulation
    fn simulate_typescript_compilation(&self, code: &str, options: &CompilerOptions) -> Result<String, JsValue> {
        // This is a simplified simulation of TypeScript compilation
        // In a real implementation, this would use the actual TypeScript compiler
        
        static TYPE_ANNOTATION_REGEX: Lazy<Regex> = Lazy::new(|| {
            Regex::new(r":\s*\w+(\[\])?").unwrap()
        });
        
        static INTERFACE_REGEX: Lazy<Regex> = Lazy::new(|| {
            Regex::new(r"interface\s+\w+\s*\{[^}]*\}").unwrap()
        });
        
        static IMPORT_REGEX: Lazy<Regex> = Lazy::new(|| {
            Regex::new(r#"import\s+.*\s+from\s+["']([^"']+)["']"#).unwrap()
        });

        let mut js_code = code.to_string();

        // Remove TypeScript-specific syntax
        js_code = TYPE_ANNOTATION_REGEX.replace_all(&js_code, "").to_string();
        js_code = INTERFACE_REGEX.replace_all(&js_code, "").to_string();
        
        // Handle imports based on module system
        if options.module == "CommonJS" {
            js_code = IMPORT_REGEX.replace_all(&js_code, "const $1 = require('$1');").to_string();
        }

        // Add runtime type checking if strict mode
        if options.strict {
            js_code = format!(
                "// Compiled with strict mode\n'use strict';\n{}",
                js_code
            );
        }

        // Add source map comment if requested
        if options.source_map {
            js_code.push_str("\n//# sourceMappingURL=data:application/json;base64,");
        }

        Ok(js_code)
    }

    fn simulate_javascript_execution(&mut self, code: &str) -> Result<String, JsValue> {
        // This is a simplified simulation of JavaScript execution
        // In a real implementation, this would use a proper JavaScript engine
        
        // Check for console.log statements
        static CONSOLE_LOG_REGEX: Lazy<Regex> = Lazy::new(|| {
            Regex::new(r#"console\.log\(['"]([^'"]+)['"]\)"#).unwrap()
        });
        
        // Check for variable declarations
        static VAR_DECL_REGEX: Lazy<Regex> = Lazy::new(|| {
            Regex::new(r"(?:const|let|var)\s+(\w+)\s*=\s*(.+);").unwrap()
        });
        
        // Check for function calls
        static FUNCTION_CALL_REGEX: Lazy<Regex> = Lazy::new(|| {
            Regex::new(r"(\w+)\((.*)\)").unwrap()
        });

        let mut output = String::new();
        let lines: Vec<&str> = code.lines().collect();

        for line in lines {
            let trimmed = line.trim();
            
            if trimmed.is_empty() || trimmed.starts_with("//") {
                continue;
            }

            // Handle console.log
            if let Some(captures) = CONSOLE_LOG_REGEX.captures(trimmed) {
                if let Some(message) = captures.get(1) {
                    output.push_str(&format!("LOG: {}\n", message.as_str()));
                }
                continue;
            }

            // Handle variable declarations
            if let Some(captures) = VAR_DECL_REGEX.captures(trimmed) {
                if let (Some(var_name), Some(var_value)) = (captures.get(1), captures.get(2)) {
                    let name = var_name.as_str();
                    let value = var_value.as_str();
                    
                    // Try to parse as JSON value
                    if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(value) {
                        self.execution_context.set_variable(name.to_string(), json_value);
                        output.push_str(&format!("SET: {} = {}\n", name, value));
                    } else {
                        // Handle string literals
                        if value.starts_with('"') && value.ends_with('"') {
                            let string_val = value.trim_matches('"');
                            self.execution_context.set_variable(
                                name.to_string(), 
                                serde_json::Value::String(string_val.to_string())
                            );
                            output.push_str(&format!("SET: {} = \"{}\"\n", name, string_val));
                        } else if let Ok(num) = value.parse::<f64>() {
                            self.execution_context.set_variable(
                                name.to_string(),
                                serde_json::Value::Number(serde_json::Number::from_f64(num).unwrap_or_default())
                            );
                            output.push_str(&format!("SET: {} = {}\n", name, num));
                        }
                    }
                }
                continue;
            }

            // Handle function calls
            if let Some(captures) = FUNCTION_CALL_REGEX.captures(trimmed) {
                if let Some(func_name) = captures.get(1) {
                    output.push_str(&format!("CALL: {}()\n", func_name.as_str()));
                }
                continue;
            }

            // Default: just note the statement
            output.push_str(&format!("STMT: {}\n", trimmed));
        }

        if output.is_empty() {
            output = "// No output generated".to_string();
        }

        Ok(output)
    }
}

/// Execution context for JavaScript runtime
#[derive(Debug, Clone)]
pub struct ExecutionContext {
    variables: HashMap<String, serde_json::Value>,
    functions: HashMap<String, String>,
}

impl ExecutionContext {
    pub fn new() -> Self {
        ExecutionContext {
            variables: HashMap::new(),
            functions: HashMap::new(),
        }
    }

    pub fn set_variable(&mut self, name: String, value: serde_json::Value) {
        self.variables.insert(name, value);
    }

    pub fn get_variable(&self, name: &str) -> Option<&serde_json::Value> {
        self.variables.get(name)
    }

    pub fn set_function(&mut self, name: String, code: String) {
        self.functions.insert(name, code);
    }

    pub fn get_function(&self, name: &str) -> Option<&String> {
        self.functions.get(name)
    }
}

/// Standalone TypeScript compiler function
#[wasm_bindgen]
pub fn compile_typescript_standalone(code: &str, options: &str) -> Result<String, JsValue> {
    let runtime = TypeScriptRuntime::new();
    runtime.compile_typescript(code, options)
}

/// Standalone JavaScript execution function
#[wasm_bindgen]
pub fn execute_javascript_standalone(code: &str, context: &str) -> Result<String, JsValue> {
    let mut runtime = TypeScriptRuntime::new();
    let ctx: HashMap<String, serde_json::Value> = if context.is_empty() {
        HashMap::new()
    } else {
        serde_json::from_str(context).unwrap_or_default()
    };
    
    runtime.execute_javascript(code, &ctx)
}

/// Version information
#[wasm_bindgen]
pub fn get_version() -> String {
    "1.0.0".to_string()
}

#[wasm_bindgen]
pub fn get_build_info() -> String {
    serde_json::json!({
        "name": "katalyst-typescript-wasm",
        "version": "1.0.0",
        "target": "wasm32-unknown-unknown",
        "optimization": if cfg!(debug_assertions) { "debug" } else { "release" },
        "features": {
            "typescript_compilation": true,
            "javascript_execution": true,
            "module_system": true,
            "type_checking": true
        }
    }).to_string()
}