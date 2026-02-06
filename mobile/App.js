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

// --- MODULE ADMINISTRATOR (MANAGEMENT) ---
import ProductsListScreen from './src/screens/ProductsListScreen';
import TeamScreen from './src/screens/TeamScreen';
import SupplierScreens from './src/screens/SupplierScreens';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AdminLogsScreen from './src/screens/AdminLogsScreen';
import ReceiptsHistoryScreen from './src/screens/ReceiptsHistoryScreen';
import AdminQuickAddScreen from './src/screens/AdminQuickAddScreen';
import SupplierReturnsScreen from './src/screens/SupplierReturnsScreen'; // <--- IMPORT NOU

const Stack = createNativeStackNavigator();

// Ignorăm avertismentele minore de UI
LogBox.ignoreLogs(['new NativeEventEmitter']);

export default function App() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.log("⚠️ Eroare sesiune:", error.message);
                    if (error.message.includes("Refresh Token")) {
                        await supabase.auth.signOut();
                        setSession(null);
                    }
                } else {
                    setSession(session);
                }
            } catch (err) {
                console.error("Eroare neașteptată auth:", err);
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (_event === 'TOKEN_REFRESH_REVOKED') {
                setSession(null);
            } else {
                setSession(session);
            }
            setLoading(false);
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
                    // --- STIVA PUBLICĂ ---
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Creare Cont' }} />
                    </>
                ) : (
                    // --- STIVA PRIVATĂ ---
                    <>
                        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />

                        {/* Rute Gestionar */}
                        <Stack.Screen name="InventoryReceipt" component={InventoryReceipt} options={{ headerShown: false }} />
                        <Stack.Screen name="StockCheckScreen" component={StockCheckScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="ScrapScreen" component={ScrapScreen} options={{ title: 'Raportare Pierderi' }} />
                        <Stack.Screen name="InventoryAuditScreen" component={InventoryAuditScreen} options={{ headerShown: false }} />

                        {/* Rute Admin */}
                        <Stack.Screen name="ProductsList" component={ProductsListScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="TeamScreen" component={TeamScreen} options={{ title: 'Gestionare Echipă' }} />
                        <Stack.Screen name="SupplierScreens" component={SupplierScreens} options={{ title: 'Furnizori' }} />
                        <Stack.Screen name="ReportsScreen" component={ReportsScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="SettingsScreen" component={SettingsScreen} options={{ title: 'Setări Sistem' }} />
                        <Stack.Screen name="AdminLogsScreen" component={AdminLogsScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="ReceiptsHistoryScreen" component={ReceiptsHistoryScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="AdminQuickAddScreen" component={AdminQuickAddScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="SupplierReturnsScreen" component={SupplierReturnsScreen} options={{ headerShown: false }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}