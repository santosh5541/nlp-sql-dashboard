import React, { useState } from "react";
import {
  Box, Button, Card, CardContent, TextField, Typography, CircularProgress, Alert,
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Paper
} from "@mui/material";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function Dashboard() {
  const [dbInfo, setDbInfo] = useState({ host: "localhost", user: "root", password: "", database: "" });
  const [connected, setConnected] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [tableData, setTableData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- Connect to database ---
  const connectDb = async () => {
    if (!dbInfo.host || !dbInfo.user || !dbInfo.password || !dbInfo.database) {
      setError("All database fields are required");
      return;
    }
    setError(""); setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbInfo),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");
      setConnected(true);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  // --- Disconnect from database ---
  const disconnectDb = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/disconnect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Disconnect failed");
      setConnected(false);
      setAnswer(""); setTableData([]); setChartData([]);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  // --- Ask NLP question ---
  const handleQuery = async () => {
    if (!question.trim()) { setError("Enter a question"); return; }
    if (!connected) { setError("Connect to a database first"); return; }
    setError(""); setAnswer(""); setTableData([]); setChartData([]); setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Query failed");

      setAnswer(data.answer);

      if (Array.isArray(data.sql_result) && data.sql_result.length > 0) {
        setTableData(data.sql_result);

        // Prepare chart data dynamically
        const firstRow = data.sql_result[0];
        const stringCol = Object.keys(firstRow).find(k => typeof firstRow[k] === "string") || Object.keys(firstRow)[0];
        const numericCol = Object.keys(firstRow).find(k => typeof firstRow[k] === "number");

        setChartData(
          data.sql_result.map((row, idx) => ({
            name: row[stringCol],
            value: numericCol ? row[numericCol] : 1,
          }))
        );
      } else {
        setTableData([]);
        setChartData([]);
      }
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <Box display="flex" justifyContent="center" p={2}>
      <Card sx={{ maxWidth: 1000, width: "100%", boxShadow: 4 }}>
        <CardContent>
          <Typography variant="h4" align="center" color="primary">
            NLP to SQL Dashboard
          </Typography>

          {/* --- Database Input Fields --- */}
          <Box mt={3} display="flex" gap={2} flexWrap="wrap">
            <TextField label="Host" value={dbInfo.host} onChange={e => setDbInfo({ ...dbInfo, host: e.target.value })} />
            <TextField label="User" value={dbInfo.user} onChange={e => setDbInfo({ ...dbInfo, user: e.target.value })} />
            <TextField label="Password" type="password" value={dbInfo.password} onChange={e => setDbInfo({ ...dbInfo, password: e.target.value })} />
            <TextField label="Database" value={dbInfo.database} onChange={e => setDbInfo({ ...dbInfo, database: e.target.value })} />
            <Button variant="contained" onClick={connectDb} disabled={connected || loading}>Connect</Button>
            <Button variant="outlined" onClick={disconnectDb} disabled={!connected || loading}>Disconnect</Button>
          </Box>

          <Typography mt={1}>Status: {connected ? "Connected ✅" : "Disconnected ❌"}</Typography>

          {/* --- Question Input --- */}
          <Box mt={3} display="flex" gap={2}>
            <TextField
              fullWidth
              label="Ask a question"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyPress={e => e.key === "Enter" && handleQuery()}
            />
            <Button variant="contained" onClick={handleQuery} disabled={!connected || loading}>
              {loading ? <CircularProgress size={24} /> : "Ask"}
            </Button>
          </Box>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          {answer && (
            <Box mt={3} p={2} bgcolor="#e3f2fd" borderRadius={2}>
              <Typography variant="subtitle1">Answer:</Typography>
              <Typography>{answer}</Typography>
            </Box>
          )}

          {/* --- Table View --- */}
          {tableData.length > 0 && (
            <TableContainer component={Paper} sx={{ mt: 3, maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>{Object.keys(tableData[0]).map(col => <TableCell key={col}>{col}</TableCell>)}</TableRow>
                </TableHead>
                <TableBody>
                  {tableData.map((row, idx) => (
                    <TableRow key={idx}>
                      {Object.keys(row).map((col, i) => <TableCell key={i}>{row[col]}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* --- Charts --- */}
          {chartData.length > 0 && (
            <Box mt={3}>
              <Typography variant="h6">Bar Chart</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name"/>
                  <YAxis/>
                  <Tooltip/>
                  <Legend/>
                  <Bar dataKey="value" fill="#1976d2"/>
                </BarChart>
              </ResponsiveContainer>

              <Typography variant="h6" mt={2}>Pie Chart</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={80} label>
                    {chartData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip/>
                  <Legend/>
                </PieChart>
              </ResponsiveContainer>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
