import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // If already authenticated, redirect to setup or dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      setLocation('/setup');
    }
  }, [isAuthenticated, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !company) {
      setError('Vennligst fyll inn alle felter');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ugyldig e-postadresse');
      return;
    }

    setLoading(true);
    
    // Simulate login API call
    setTimeout(() => {
      try {
        login(email, company);
        setLocation('/setup');
      } catch (err) {
        setError('Innlogging mislyktes. Prøv igjen.');
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-slate-900 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="text-5xl mb-2">🐟</div>
          <CardTitle className="text-2xl">AquaShield</CardTitle>
          <CardDescription>Innlogging</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium">E-post</label>
              <Input
                type="email"
                placeholder="navn@bedrift.no"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                disabled={loading}
                className="h-10"
              />
            </div>

            {/* Company */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Bedrift / Navn</label>
              <Input
                type="text"
                placeholder="SalMar AS, Lerøy Seafood, osv."
                value={company}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompany(e.target.value)}
                disabled={loading}
                className="h-10"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <Button 
              type="submit" 
              className="w-full h-10 bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Logger inn...' : 'Logg inn'}
            </Button>

            {/* Info */}
            <div className="text-xs text-slate-500 text-center pt-2">
              <p>Demo-innlogging. Bruk hvilken som helst e-post og bedriftsnavn.</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
