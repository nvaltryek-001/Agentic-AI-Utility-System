export const decidePriority = (severity) => {
  return severity === "CRITICAL" ? "HIGH" : "LOW";
};
