import express from 'express';
import session from 'express-session';
import {createClient} from "redis"
import * as oidc from 'openid-client';
import dotenv from 'dotenv';
import {RedisStore} from "connect-redis";
import cors from 'cors';

const myFetch = (url, options) => {
    const u = new URL(url);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        if (u.port === '8080') {
            u.hostname = 'keycloak';
        }
    }
    return fetch(u.href, options);
};

dotenv.config();

let redisClient = createClient({url:process.env.REDIS_URL || 'redis://redis:6379'})
redisClient.connect().catch(console.error)


const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

const store = new RedisStore({
    client: redisClient,
    prefix: "bionicpro_auth:",
});

app.use(session({
    store: store,
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || 'some-very-secret-key',
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

let config;

async function initOidc() {
    try {
        const issuer = new URL(process.env.KEYCLOAK_ISSUER || 'http://localhost:8080/realms/reports-realm');
        config = await oidc.discovery(
            issuer,
            process.env.CLIENT_ID || 'reports-frontend',
            process.env.CLIENT_SECRET,
            undefined,
            {
                execute: [oidc.allowInsecureRequests],
                [oidc.customFetch]: myFetch
            }
        );
        console.log('OIDC configuration discovered successfully');
    } catch (err) {
        console.error('Failed to discover OIDC configuration, retrying in 5 seconds...', err.message);
        setTimeout(initOidc, 5000);
    }
}

initOidc();

app.get('/healthcheck', (req, res) => {
    res.send('Auth server is running. <a href="/login">Login</a>');
});

app.get('/login', async (req, res) => {
    if (!config) return res.status(503).send('Auth service is initializing, please try again in a moment.');

    const code_verifier = oidc.randomPKCECodeVerifier();
    const code_challenge = await oidc.calculatePKCECodeChallenge(code_verifier);

    req.session.code_verifier = code_verifier;

    const redirectTo = oidc.buildAuthorizationUrl(config, {
        redirect_uri: process.env.REDIRECT_URI || `http://localhost:${port}/callback`,
        scope: 'openid profile email',
        code_challenge,
        code_challenge_method: 'S256',
    });

    res.redirect(redirectTo.href);
});

app.get('/callback', async (req, res) => {
    if (!config) return res.status(503).send('Auth service is initializing');
    
    try {
        const redirect_uri = process.env.REDIRECT_URI || `http://localhost:${port}/callback`;
        const currentUrl = new URL(req.url, redirect_uri);
        
        console.log('Callback received. URL:', currentUrl.href);
        console.log('Using code_verifier from session:', req.session.code_verifier ? 'present' : 'missing');

        const tokenSet = await oidc.authorizationCodeGrant(config, currentUrl, {
            pkceCodeVerifier: req.session.code_verifier,
        });

        const userinfo = await oidc.fetchUserInfo(config, tokenSet.access_token, oidc.skipSubjectCheck);
        
        req.session.user = userinfo;
        req.session.tokens = tokenSet;
        
        res.redirect('http://localhost:3000');
    } catch (err) {
        console.error('Authentication error:', err);
        res.status(500).send('Authentication failed');
    }
});

app.get('/session', (req, res) => {
    if (!req.session.user) {
        return res.json({ authenticated: false });
    }
    res.json({
        authenticated: true,
        user: req.session.user
    });
});

app.get('/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({
        user: req.session.user,
        message: "This data is retrieved from Keycloak, which can be integrated with OpenLDAP."
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.send('Logged out successfully');
});

app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});
