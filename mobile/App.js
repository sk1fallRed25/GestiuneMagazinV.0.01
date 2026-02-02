import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './src/lib/supabase';

// --- ECRANE AUTENTIFICARE ---
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// --- DASHBOARD PRINCIPAL ---
import DashboardScreen from './src/screens/DashboardScreen';

// --- MODULE GESTIONAR (OPERATIVE) ---
import InventoryReceipt from './src/screens/InventoryReceipt';
import StockCheckScreen from './src/screens/StockCheckScreen';
import ScrapScreen from './src/screens/ScrapScreen';
import InventoryAuditScreen from './src/screens/InventoryAuditScreen';
import ProductsListScreen from './src/screens/ProductsListScreen';

// --- MODULE ADMINISTRATOR (MANAGEMENT) ---
import TeamScreen from './src/screens/TeamScreen';
import SupplierScreens from './src/screens/SupplierScreens';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AdminLogsScreen from './src/screens/AdminLogsScreen'; // <--- ECRANUL NOU

const Stack = createNativeStackNavigator();

// Ignorăm avertismentele minore de UI
LogBox.ignoreLogs(['new NativeEventEmitter']);

export default function App() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Verificăm sesiunea curentă
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Ascultăm schimbările de stare (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: true, headerBackTitleVisible: false }}>
                {!session ? (
                    // --- STIVA PUBLICĂ (NEAUTENTIFICAT) ---
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Creare Cont' }} />
                    </>
                ) : (
                    // --- STIVA PRIVATĂ (AUTENTIFICAT) ---
                    <>
                        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />

                        {/* Rute Gestionar (Accesibile Tuturor) */}
                        <Stack.Screen name="InventoryReceipt" component={InventoryReceipt} options={{ title: 'Recepție Marfă' }} />
                        <Stack.Screen name="StockCheckScreen" component={StockCheckScreen} options={{ title: 'Verificare & Transfer' }} />
                        <Stack.Screen name="ScrapScreen" component={ScrapScreen} options={{ title: 'Raportare Pierderi' }} />
                        <Stack.Screen name="InventoryAuditScreen" component={InventoryAuditScreen} options={{ title: 'Inventar Rapid' }} />
                        <Stack.Screen name="ProductsList" component={ProductsListScreen} options={{ title: 'Nomenclator Produse' }} />

                        {/* Rute Admin (Doar Administratori) */}
                        <Stack.Screen name="TeamScreen" component={TeamScreen} options={{ title: 'Gestionare Echipă' }} />
                        <Stack.Screen name="SupplierScreens" component={SupplierScreens} options={{ title: 'Furnizori' }} />
                        <Stack.Screen name="ReportsScreen" component={ReportsScreen} options={{ title: 'Rapoarte Generale' }} />
                        <Stack.Screen name="SettingsScreen" component={SettingsScreen} options={{ title: 'Setări Sistem' }} />
                        <Stack.Screen name="AdminLogsScreen" component={AdminLogsScreen} options={{ title: 'Jurnal Probleme' }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}