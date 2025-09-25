import React, { useState } from "react";
import {
  Box, Button, Card, CardContent, TextField, Typography, CircularProgress, Alert,
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Paper
} from "@mui/material";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";

// FIX 2: A longer array of distinct colors for the Pie Chart to prevent repetition
const PIE_COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042",
  "#A26EBB", "#E67F00", "#7B68EE", "#20B2AA", 
  "#3CB371", "#B8860B", "#DC143C", "#5F9EA0"
];

export default function Dashboard() {
  const [dbInfo, setDbInfo] = useState({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: ""
  });
  const [connected, setConnected] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [tableData, setTableData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [xAxisKey, setXAxisKey] = useState(""); 
  const [yAxisKey, setYAxisKey] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- Connect to database ---
  const connectDb = async () => {
    if (!dbInfo.host || !dbInfo.user || !dbInfo.password || !dbInfo.database || !dbInfo.port) {
      setError("All database fields are required");
      return;
    }
    setError(""); setLoading(true);
    try {
      const res = await fetch("https://nlp-sql-dashboard-backend.onrender.com/connect", {
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
      const res = await fetch("https://nlp-sql-dashboard-backend.onrender.com/disconnect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Disconnect failed");
      setConnected(false);
      setAnswer(""); setTableData([]); setChartData([]); setXAxisKey(""); setYAxisKey("");
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  // --- Ask NLP question - REVISED FOR LOGICAL AXIS LABELS ---
  const handleQuery = async () => {
    if (!question.trim()) { setError("Enter a question"); return; }
    if (!connected) { setError("Connect to a database first"); return; }
    setError(""); setAnswer(""); setTableData([]); setChartData([]); setXAxisKey(""); setYAxisKey(""); setLoading(true);

    try {
      const res = await fetch("https://nlp-sql-dashboard-backend.onrender.com/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Query failed");

      setAnswer(data.answer);

      if (Array.isArray(data.sql_result) && data.sql_result.length > 0) {
        setTableData(data.sql_result);

        let chartArray = [];
        let xKey = "", yKey = "";
        const firstRow = data.sql_result[0];

        // Identify column types
        const allCols = Object.keys(firstRow);
        const stringCols = allCols.filter(k => typeof firstRow[k] === "string");
        const numericCols = allCols.filter(k => typeof firstRow[k] === "number");

        // --- Logic for Logical X/Y Axis Labels ---
        if (stringCols.length > 0) {
          // SCENARIO 1: String Column exists (e.g., Album, City)
          xKey = stringCols[0]; 
          if (numericCols.length > 0) {
            const yCol = numericCols[0];
            yKey = `${yCol} (Value)`; 
            chartArray = data.sql_result.map(row => ({ name: row[xKey], value: row[yCol] }));
          } else {
            yKey = "Count of Records";
            const counts = {};
            data.sql_result.forEach(row => {
              const key = row[xKey];
              counts[key] = (counts[key] || 0) + 1;
            });
            chartArray = Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
          }
        } else if (numericCols.length >= 2) {
          // SCENARIO 2: Two or more numeric columns
          const xCol = numericCols[0];
          const yCol = numericCols[1];
          xKey = `${xCol} (Category)`; 
          yKey = `${yCol} (Value)`;
          chartArray = data.sql_result.map(row => ({ name: row[xCol].toString(), value: row[yCol] }));
        } else if (numericCols.length === 1) {
          // SCENARIO 3: One numeric column
          const yCol = numericCols[0];
          xKey = "Record Index";
          yKey = `${yCol} (Value)`; 
          chartArray = data.sql_result.map((row, i) => ({ name: `Record ${i + 1}`, value: row[yCol] }));
        } else {
          // SCENARIO 4: Fallback
          const firstCol = allCols[0] || "Unknown";
          xKey = `${firstCol} (Category)`;
          yKey = "Record Count";
          chartArray = data.sql_result.map((row, i) => ({ name: row[firstCol]?.toString() || `Item ${i + 1}`, value: 1 }));
        }

        setXAxisKey(xKey);
        setYAxisKey(yKey);
        setChartData(chartArray);
      } else {
        setTableData([]);
        setChartData([]);
        setXAxisKey("");
        setYAxisKey("");
      }
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <Box display="flex" justifyContent="center" p={2}>
      <Card sx={{ maxWidth: 1000, width: "100%", boxShadow: 4 }}>
        <CardContent>
          <Typography variant="h4" align="center" color="primary">NLP to SQL Dashboard</Typography>

          {/* Database Input Fields */}
          <Box mt={3} display="flex" gap={2} flexWrap="wrap">
            <TextField label="Host" value={dbInfo.host} onChange={e => setDbInfo({ ...dbInfo, host: e.target.value })} />
            <TextField label="Port" type="number" value={dbInfo.port} onChange={e => setDbInfo({ ...dbInfo, port: Number(e.target.value) })} />
            <TextField label="User" value={dbInfo.user} onChange={e => setDbInfo({ ...dbInfo, user: e.target.value })} />
            <TextField label="Password" type="password" value={dbInfo.password} onChange={e => setDbInfo({ ...dbInfo, password: e.target.value })} />
            <TextField label="Database" value={dbInfo.database} onChange={e => setDbInfo({ ...dbInfo, database: e.target.value })} />
            <Button variant="contained" onClick={connectDb} disabled={connected || loading}>Connect</Button>
            <Button variant="outlined" onClick={disconnectDb} disabled={!connected || loading}>Disconnect</Button>
          </Box>

          <Typography mt={1}>Status: {connected ? "Connected ✅" : "Disconnected ❌"}</Typography>

          {/* Question Input */}
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

          {/* Table */}
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

          {/* Charts */}
          {chartData.length > 0 && xAxisKey && yAxisKey && (
            <Box mt={3}>
              <Typography variant="h6">Bar Chart</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}> {/* Margin for rotated labels */}
                  {/* FIX 1: Removed conflicting 'label' prop. Now only uses rotation and height for readability. */}
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end"
                    height={50}
                    interval={0}
                  />
                  <YAxis label={{ value: yAxisKey, angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(val) => [`${val}`, yAxisKey]} labelFormatter={(label) => `${xAxisKey}: ${label}`} />
                  <Legend formatter={() => yAxisKey} />
                  <Bar dataKey="value" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
              <Typography variant="caption" display="block" align="center" mt={-4}>{xAxisKey}</Typography> {/* Label for X-Axis, using MUI Typography */}

              <Typography variant="h6" mt={2}>Pie Chart</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {/* FIX 2: Uses PIE_COLORS for unique colors */}
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>

                  {/* Tooltip with descriptive labels */}
                  <Tooltip
                    formatter={(val) => [`${val}`, yAxisKey]}
                    labelFormatter={(label) => `${xAxisKey}: ${label}`}
                  />

                  {/* Legend showing artist names */}
                  <Legend
                    formatter={(value, entry) => `${entry.payload.name} (${entry.payload.value})`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}