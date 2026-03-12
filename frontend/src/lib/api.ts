const API_URL = typeof window !== "undefined"
  ? window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "192.168.1.6"
    ? `${window.location.protocol}//${window.location.hostname}:8001/api`
    : "/api"
  : "/api";
