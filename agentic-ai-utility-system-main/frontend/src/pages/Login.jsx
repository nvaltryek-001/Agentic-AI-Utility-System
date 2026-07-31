import { useState } from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useApp();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      await login(formData.email, formData.password);
      setTimeout(() => navigate("/"), 500);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center 
      bg-[url('/bg.jpg')] bg-cover bg-center relative">

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md p-8 rounded-2xl 
        bg-white/10 backdrop-blur-xl border border-white/20 
        shadow-[0_0_40px_rgba(255,0,255,0.3)]"
      >

        {/* Title */}
        <h1 className="text-4xl text-center font-extrabold mb-4 
          text-transparent bg-clip-text 
          bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 animate-pulse">
          VALTRYEK 🔥
        </h1>

        <p className="text-center text-gray-300 mb-6">
          Enter the battlefield ⚡
        </p>

        {/* Email */}
        <input
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          placeholder="Enter Email"
          className="w-full mb-4 px-4 py-3 bg-black/60 border border-purple-500 
          rounded-lg text-white placeholder-gray-400 
          focus:ring-2 focus:ring-pink-500 outline-none"
        />

        {/* Password */}
        <input
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          placeholder="Enter Password"
          className="w-full mb-4 px-4 py-3 bg-black/60 border border-purple-500 
          rounded-lg text-white placeholder-gray-400 
          focus:ring-2 focus:ring-pink-500 outline-none"
        />

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm text-center mb-3">{error}</p>
        )}

        {/* Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded-xl 
          bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 
          text-white font-bold tracking-wide 
          shadow-[0_0_20px_rgba(255,0,255,0.8)] 
          hover:shadow-[0_0_30px_rgba(0,255,255,0.8)]
          transition-all"
        >
          {loading ? "Loading..." : "LOGIN 🚀"}
        </motion.button>

        {/* Toggle */}
        <p className="mt-6 text-center text-gray-400">
          {isLogin ? "New player? " : "Already joined? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-pink-400 font-bold hover:text-pink-300"
          >
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}