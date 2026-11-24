'use client';
import {useState} from 'react';

export function LogoutButton(){
  const [busy,setBusy]=useState(false);
  async function logout(){
    setBusy(true);
    try{
      await fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    } finally {
      window.location.assign('/admin/login');
    }
  }
  return <button type="button" onClick={()=>void logout()} disabled={busy} className="text-sm font-semibold text-brand underline underline-offset-4">{busy?'Cerrando…':'Cerrar sesión'}</button>;
}
