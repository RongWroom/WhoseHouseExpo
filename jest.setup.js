/* eslint-disable @typescript-eslint/no-require-imports */
// Jest setup file for WhoseHouse app

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock expo-constants
jest.mock('expo-constants', () => ({
    expoConfig: {
        extra: {
            SUPABASE_URL: 'https://test.supabase.co',
            SUPABASE_ANON_KEY: 'test-anon-key',
        },
    },
}));

// Mock expo-device
jest.mock('expo-device', () => ({
    isDevice: true,
    brand: 'Test',
    modelName: 'Test Device',
    osName: 'iOS',
    osVersion: '17.0',
    deviceType: 1,
    DeviceType: {
        PHONE: 1,
        TABLET: 2,
    },
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
    digestStringAsync: jest.fn(() => Promise.resolve('mock-hash')),
    CryptoDigestAlgorithm: {
        SHA256: 'SHA-256',
    },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
    const inset = { top: 0, right: 0, bottom: 0, left: 0 };
    return {
        SafeAreaProvider: ({ children }) => children,
        SafeAreaView: ({ children }) => children,
        useSafeAreaInsets: () => inset,
        useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
    };
});

// Mock Supabase client
jest.mock('./src/lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
            signInWithPassword: jest.fn(),
            signUp: jest.fn(),
            signOut: jest.fn(),
            onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
        },
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
                    order: jest.fn(() => Promise.resolve({ data: [], error: null })),
                })),
                order: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
            update: jest.fn(() => Promise.resolve({ data: null, error: null })),
            delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
        channel: jest.fn(() => ({
            on: jest.fn(() => ({ subscribe: jest.fn() })),
            subscribe: jest.fn(),
            unsubscribe: jest.fn(),
        })),
        removeChannel: jest.fn(),
        storage: {
            from: jest.fn(() => ({
                upload: jest.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
                getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://test.url/image.jpg' } })),
                createSignedUrl: jest.fn(() =>
                    Promise.resolve({ data: { signedUrl: 'https://test.url/signed' }, error: null }),
                ),
            })),
        },
    },
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getCurrentUser: jest.fn(),
    validateChildToken: jest.fn(),
    sendChildMessage: jest.fn(),
    generateChildAccessToken: jest.fn(),
}));

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
    openURL: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    getInitialURL: jest.fn(() => Promise.resolve(null)),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Silence console logs during tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// Global test timeout
jest.setTimeout(10000);
