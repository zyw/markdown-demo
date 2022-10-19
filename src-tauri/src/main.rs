#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{ Menu, Submenu, MenuItem, CustomMenuItem };
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn menus() -> Menu {
    let submenu_gear = Submenu::new(
        "Gear",
        Menu::new()
          .add_native_item(MenuItem::Copy)
          .add_native_item(MenuItem::Paste)
          .add_native_item(MenuItem::Separator)
          .add_native_item(MenuItem::Zoom)
          .add_native_item(MenuItem::Separator)
          .add_native_item(MenuItem::Hide)
          .add_native_item(MenuItem::CloseWindow)
          .add_native_item(MenuItem::Quit),
      );
      let close = CustomMenuItem::new("test-event".to_string(), "事件通信");
      let quit = CustomMenuItem::new("quit".to_string(), "Quit");
      let submenu_customer = Submenu::new(
        "Customer", 
        Menu::new()
          .add_item(close)
          .add_item(quit)
        );
      return Menu::new()
        .add_submenu(submenu_gear)
        .add_submenu(submenu_customer);
}

#[derive(Clone, serde::Serialize)]
struct Payload {
  message: String,
}

fn main() {
    tauri::Builder::default()
        // 添加菜单
        .menu(menus())
        // 监听自定义菜单事件
        .on_menu_event(|event| match event.menu_item_id() {
            "quit" => {
                std::process::exit(0);
            }
            "test-event" => {
                // 发布事件前端（javascript）可以监听此事件
                event.window().emit("test-event", Payload { message: "## Tauri is awesome!".into() }).unwrap();
            }
            _ => {}
        })
        // 注册命令
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
