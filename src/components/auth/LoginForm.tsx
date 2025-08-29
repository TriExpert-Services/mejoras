import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToSignup }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
    } else {
      onSuccess?.();
    }
    
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Iniciar Sesión</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Correo Electrónico
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
          
          {onSwitchToSignup && (
            <div className="text-center">
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="text-sm text-blue-600 hover:underline"
                disabled={loading}
              >
                ¿No tienes cuenta? Regístrate
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}