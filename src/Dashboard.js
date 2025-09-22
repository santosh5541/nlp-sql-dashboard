import React, { useState } from "react";
import {
  Box, Button, Card, CardContent, TextField, Typography, CircularProgress, Alert,
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Paper
} from "@mui/material";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function Dashboard() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tableData, setTableData] = useState([]);
  const [chartData, setChartData] = useState([]);

  const handleQuery = async () => {
    if (!question.trim()) { setError("Enter a question"); return; }
    setError(""); setAnswer(""); setTableData([]); setChartData([]); setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");

      setAnswer(data.answer);

      if (Array.isArray(data.sql_result) && data.sql_result.length > 0) {
        setTableData(data.sql_result);

        // --- Dynamic chart data generation ---
        const firstRow = data.sql_result[0];
        const stringCol = Object.keys(firstRow).find(k => typeof firstRow[k] === "string") || Object.keys(firstRow)[0];
        const numericCol = Object.keys(firstRow).find(k => typeof firstRow[k] === "number");

        setChartData(
          data.sql_result.map((row, index) => ({
            name: row[stringCol],
            value: numericCol ? row[numericCol] : 1, // assign 1 if no numeric column
          }))
        );
      } else {
        setTableData([]);
        setChartData([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" p={2}>
      <Card sx={{ maxWidth: 1000, width: "100%", boxShadow: 4 }}>
        <CardContent>
          <Typography variant="h4" align="center" color="primary">NLP to SQL Dashboard</Typography>

          <Box mt={3} display="flex" gap={2}>
            <TextField
              fullWidth
              label="Ask a question"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyPress={e => e.key === "Enter" && handleQuery()}
            />
            <Button variant="contained" onClick={handleQuery} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : "Ask"}
            </Button>
          </Box>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          {answer && <Box mt={3} p={2} bgcolor="#e3f2fd" borderRadius={2}>
            <Typography variant="subtitle1">Answer:</Typography>
            <Typography>{answer}</Typography>
          </Box>}

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
