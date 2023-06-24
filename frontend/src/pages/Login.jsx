import React, { useState } from "react";
import axios from 'axios';
import redirect from "react-router-dom/es/Redirect.js";

const Login = () => {
    const [id, setId] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post("api/v1/user/login", { id, password});
            const { access_token } = response.data;

            // 성공했을 경우 sessionStorage access_token 저장
            // sessionStorage.setItem("access_token", access_token);
            // "/" 주소로 리다이렉트
            // redirect("/");
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div>
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
                <div>
                    <label htmlFor="username">Username:</label>
                    <input
                        type="text"
                        id="username"
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <button type="submit">Login</button>
            </form>
        </div>
    );
};

export default Login;