import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
// import { supabase } from '@/lib/db/supabase';

passport.use(
  new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        // Placeholder for Supabase logic:
        // const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
        // if (error || !user || user.password !== password) {
        //   return done(null, false, { message: 'Incorrect email or password.' });
        // }
        
        // Mock user for scaffolding purposes
        const user = { id: '1', email };
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser((id: string, done) => {
  // Placeholder deserialization
  done(null, { id, email: 'user@example.com' });
});

export default passport;
