import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Callback() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      const redirectUrl = sessionStorage.getItem("redirectAfterLogin") || "/";
      sessionStorage.removeItem("redirectAfterLogin");

      if (isAuthenticated) {
        navigate(redirectUrl, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "50vh",
      }}
    >
      <p>Completing login...</p>
    </div>
  );
}
