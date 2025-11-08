import { io } from "socket.io-client";

const ENV = process.env.REACT_APP_ENV;
const SOCKET_URL =
  ENV === "development"
    ? process.env.REACT_APP_DEV_SOCKET || "http://localhost:12000"
    : process.env.REACT_APP_PROD_SOCKET || "/";

const socket = io(SOCKET_URL, { transports: ["websocket"] });

export { socket, ENV, SOCKET_URL };
