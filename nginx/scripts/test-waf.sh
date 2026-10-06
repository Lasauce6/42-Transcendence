#!/bin/sh
# Tests WAF

BASE="${1:-https://127.0.0.1}"
HTTP_BASE="${2:-http://127.0.0.1}"
FAILED=0

code() {
    curl -sk -o /dev/null -w '%{http_code}' "$@"
}

check() {
    name="$1"; expect="$2"; got="$3"
    case "|${expect}|" in
        *"|${got}|"*) echo "PASS  $name ($got)";;
        *) echo "FAIL  $name (attendu $expect, obtenu $got)"; FAILED=1;;
    esac
}

check "healthcheck https"      200 "$(code "$BASE/healthz")"
check "trafic legitime (/)"    200 "$(code "$BASE/")"
check "redirect http -> https" 301 "$(code "$HTTP_BASE/some-page")"
check "SQLi"                   403 "$(code "$BASE/api/?id=%27%20OR%20%271%27%3D%271")"
check "XSS (JSON)"             403 "$(code -X POST "$BASE/api/login/" -H 'Content-Type: application/json' -d '{"x":"<script>alert(1)</script>"}')"
check "path traversal"         "400|403" "$(code --path-as-is "$BASE/../..//etc/passwd")"
check "scanner UA"             403 "$(code -A 'Nikto' "$BASE/api/")"

echo
if [ "$FAILED" -eq 0 ]; then
    echo "WAF OK : tous les tests passent"
else
    echo "WAF KO : au moins un test a echoue"
fi
exit "$FAILED"
