import axios from "axios";

export const analyzeSensorData = async (value) => {
  const res = await axios.post(
    "http://127.0.0.1:8000/predict?sensor_value=" + value
  );
  return res.data;
};
