use eigenvista_control::{Connection, RpcError, call_until_complete, wait_for_job};
use serde_json::{Value, json};
use std::{path::PathBuf, time::Duration};

const HELP: &str = "Usage: eigenvista-ctl --connection FILE METHOD [--params JSON | --params-file FILE] [--wait SECONDS]\n\nConnects to an opt-in running EigenVista instance. Prints the JSON result; failures\nprint {\"error\":{code,message,data}} and exit 1. --wait polls accepted jobs; a wait\ntimeout does not cancel a job. The private descriptor/token is never printed.\n";

fn run(args: Vec<String>) -> Result<Value, RpcError> {
    let mut connection = None;
    let mut method = None;
    let mut params = None;
    let mut wait = 0;
    let mut args = args.into_iter();
    while let Some(arg) = args.next() {
        let missing =
            || RpcError::new(-32602, "invalid_params", format!("Missing value for {arg}"));
        match arg.as_str() {
            "--connection" => {
                if connection.is_some() {
                    return Err(RpcError::new(
                        -32602,
                        "invalid_params",
                        "Repeated connection flag",
                    ));
                }
                connection = Some(PathBuf::from(args.next().ok_or_else(missing)?));
            }
            "--params" | "--params-file" => {
                if params.is_some() {
                    return Err(RpcError::new(
                        -32602,
                        "invalid_params",
                        "Choose one params source",
                    ));
                }
                let value = args.next().ok_or_else(missing)?;
                let parsed: Value = if arg == "--params-file" {
                    let file = std::fs::File::open(value).map_err(|_| {
                        RpcError::new(-32006, "io_error", "Could not open params file")
                    })?;
                    serde_json::from_reader(file)
                } else {
                    serde_json::from_str(&value)
                }
                .map_err(|_| {
                    RpcError::new(-32602, "invalid_params", "Params must be valid UTF-8 JSON")
                })?;
                params = Some(parsed);
            }
            "--wait" => {
                wait = args
                    .next()
                    .ok_or_else(missing)?
                    .parse::<u64>()
                    .map_err(|_| {
                        RpcError::new(
                            -32602,
                            "invalid_params",
                            "Wait must be nonnegative whole seconds",
                        )
                    })?;
                if std::time::Instant::now()
                    .checked_add(Duration::from_secs(wait))
                    .is_none()
                {
                    return Err(RpcError::new(
                        -32602,
                        "invalid_params",
                        "Wait duration cannot be represented by this platform",
                    ));
                }
            }
            value if !value.starts_with('-') && method.is_none() => method = Some(value.to_owned()),
            _ => {
                return Err(RpcError::new(
                    -32602,
                    "invalid_params",
                    "Unknown or duplicate command argument; use --help",
                ));
            }
        }
    }
    let connection = Connection::load(&connection.ok_or_else(|| {
        RpcError::new(-32602, "invalid_params", "--connection FILE is required")
    })?)?;
    let method = method.ok_or_else(|| {
        RpcError::new(
            -32602,
            "invalid_params",
            "An application method is required",
        )
    })?;
    let result = call_until_complete(&connection, &method, params.unwrap_or_else(|| json!({})))?;
    wait_for_job(&connection, result, Duration::from_secs(wait))
}
fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args == ["--help"] || args == ["-h"] {
        print!("{HELP}");
        return;
    }
    if args == ["--version"] {
        println!("eigenvista-ctl {}", env!("CARGO_PKG_VERSION"));
        return;
    }
    match run(args) {
        Ok(result) => println!("{result}"),
        Err(error) => {
            println!("{}", json!({"error":error}));
            std::process::exit(1);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unrepresentable_wait_is_rejected_before_connection_or_dispatch() {
        let error = run(vec!["--wait".into(), u64::MAX.to_string()]).unwrap_err();
        assert_eq!(error.data.unwrap()["kind"], "invalid_params");
        assert!(error.message.contains("represented"));
    }
}
