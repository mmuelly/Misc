import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../hooks/useAuth";
import { useState } from "react";

export default function GoogleLoginButton() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-3">
      <GoogleLogin
        onSuccess={async (credentialResponse) => {
          try {
            setError(null);
            if (credentialResponse.credential) {
              await login(credentialResponse.credential);
            }
          } catch {
            setError("Login failed. Please try again.");
          }
        }}
        onError={() => {
          setError("Google login was unsuccessful. Please try again.");
        }}
        shape="pill"
        size="large"
        theme="outline"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
