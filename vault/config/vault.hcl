storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_cert_file = "/vault/tls/server.crt"
  tls_key_file  = "/vault/tls/server.key"
}

api_addr       = "https://vault:8200"
ui             = false
log_level      = "info"
disable_mlock  = true
