import React from "react";
import Dashboard from "./Dashboard";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";

const theme = createTheme({ palette: { mode: "light", primary: { main: "#1976d2" } } });

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Dashboard />
    </ThemeProvider>
  );
}
