import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle } from 'lucide-react';

const MyFacilities: React.FC = () => {
  const { user, updateFacilities, updateVessels } = useAuth();
  const [, setLocation] = useLocation();
  const [facilitiesInput, setFacilitiesInput] = useState(user?.facilities.join(', ') || '');
  const [vesselsInput, setVesselsInput] = useState(user?.vessels.join(', ') || '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Kreves innlogging</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">Du må logge inn først før du kan sette opp dine anlegg og båter.</p>
            <Button 
              onClick={() => setLocation('/login')} 
              className="w-full mt-4"
            >
              Gå til innlogging
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSave = () => {
    try {
      const facilities = facilitiesInput
        .split(',')
        .map(n => parseInt(n.trim()))
        .filter(n => !isNaN(n));
      
      const vessels = vesselsInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s);

      if (facilities.length === 0 && vessels.length === 0) {
        setError('Legg til minst ett anlegg eller en båt');
        return;
      }

      updateFacilities(facilities);
      updateVessels(vessels);
      setSaved(true);
      setError('');

      setTimeout(() => {
        setLocation('/dashboard');
      }, 1500);
    } catch (err) {
      setError('Feil ved lagring av data');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🐟</span>
              Velkommen, {user.company}!
            </CardTitle>
            <CardDescription>
              Sett opp dine anlegg og båter for personalisert overvåking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Anlegg */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Dine lokaliteter (kommaseparert)
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Skriv inn lokalitetsnumrene du eier, skilt med komma. F.eks: 12345, 12346, 12347
              </p>
              <Input
                type="text"
                value={facilitiesInput}
                onChange={(e) => setFacilitiesInput(e.target.value)}
                placeholder="12345, 12346, 12347"
                className="font-mono"
              />
              {facilitiesInput && (
                <p className="text-xs text-slate-500 mt-1">
                  {facilitiesInput.split(',').filter(s => s.trim()).length} lokalitet(er) lagt til
                </p>
              )}
            </div>

            {/* Båter */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Dine båter (MMSI eller navn)
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Skriv inn MMSI-nummer eller båtnavn, skilt med komma
              </p>
              <Input
                type="text"
                value={vesselsInput}
                onChange={(e) => setVesselsInput(e.target.value)}
                placeholder="257123456, Havdrønningen"
              />
              {vesselsInput && (
                <p className="text-xs text-slate-500 mt-1">
                  {vesselsInput.split(',').filter(s => s.trim()).length} båt(er) lagt til
                </p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Success message */}
            {saved && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                Dine anlegg og båter er lagret! Omdirigerer til dashboard...
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleSave}
                size="lg"
                className="flex-1"
                disabled={saved}
              >
                {saved ? 'Lagret ✓' : 'Lagre og fortsett'}
              </Button>
              <Button 
                onClick={() => setLocation('/dashboard')}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                Hopp over for nå
              </Button>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Du kan endre dette senere i innstillinger
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyFacilities;
