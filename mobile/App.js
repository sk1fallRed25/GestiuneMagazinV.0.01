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

// --- MODULE GESTIONAR (DEPOZIT & OPERATIV) ---
import InventoryReceipt from './src/screens/InventoryReceipt';
import StockCheckScreen from './src/screens/StockCheckScreen';
import ScrapScreen from './src/screens/ScrapScreen';
import InventoryAuditScreen from './src/screens/InventoryAuditScreen';
import TransferScreen from './src/screens/TransferScreen';
import ExpirationsScreen from './src/screens/ExpirationsScreen';

// --- MODULE ADMINISTRATOR (MANAGEMENT) ---
import ProductsListScreen from './src/screens/ProductsListScreen';
import AddProductScreen from './src/screens/AddProductScreen'; // <--- IMPORT NOU
import TeamScreen from './src/screens/TeamScreen';
import SupplierScreens from './src/screens/SupplierScreens';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AdminLogsScreen from './src/screens/AdminLogsScreen';
import ReceiptsHistoryScreen from './src/screens/ReceiptsHistoryScreen';
import AdminQuickAddScreen from './src/screens/AdminQuickAddScreen';
import SupplierReturnsScreen from './src/screens/SupplierReturnsScreen';
import AdminSupplyOrdersScreen from './src/screens/AdminSupplyOrdersScreen';
import AdminSmartRestockScreen from './src/screens/AdminSmartRestockScreen';

// --- MODULE AGENT (B2B) ---
import AgentSupplyOrderScreen from './src/screens/AgentSupplyOrderScreen';
import AgentSupplyHistoryScreen from './src/screens/AgentSupplyHistoryScreen';

const Stack = createNativeStackNavigator();

// Ignorăm warning-uri minore
LogBox.ignoreLogs(['new NativeEventEmitter']);

export default function App() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Verificăm sesiunea curentă
        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    if (error.message.includes("Refresh Token")) {
                        await supabase.auth.signOut();
                        setSession(null);
                    }
                } else {
                    setSession(session);
                }
            } catch (err) {
                console.error("Auth Error:", err);
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        // 2. Ascultăm schimbările de stare (Login/Logout)
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
            <Stack.Navigator
                screenOptions={{
                    headerShown: true,
                    headerBackTitleVisible: false,
                    headerTintColor: '#1f2937',
                    headerTitleStyle: { fontWeight: 'bold' }
                }}
            >
                {!session ? (
                    // --- RUTE PUBLICE (Neautentificat) ---
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Creare Cont' }} />
                    </>
                ) : (
                    // --- RUTE PROTEJATE (Autentificat) ---
                    <>
                        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />

                        {/* Secțiunea Depozit */}
                        <Stack.Screen name="InventoryReceipt" component={InventoryReceipt} options={{ headerShown: false }} />
                        <Stack.Screen name="StockCheckScreen" component={StockCheckScreen} options={{ title: 'Verificare Stoc' }} />
                        <Stack.Screen name="TransferScreen" component={TransferScreen} options={{ title: 'Transfer Marfă', headerShown: false }} />
                        <Stack.Screen name="ExpirationsScreen" component={ExpirationsScreen} options={{ title: 'Monitorizare Expirări', headerShown: false }} />
                        <Stack.Screen name="ScrapScreen" component={ScrapScreen} options={{ title: 'Raportare Pierderi' }} />
                        <Stack.Screen name="InventoryAuditScreen" component={InventoryAuditScreen} options={{ title: 'Inventar' }} />

                        {/* Secțiunea Admin */}
                        <Stack.Screen name="AdminSupplyOrdersScreen" component={AdminSupplyOrdersScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="AdminSmartRestockScreen" component={AdminSmartRestockScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="ProductsList" component={ProductsListScreen} options={{ title: 'Catalog Produse' }} />

                        {/* --- RUTA NOUĂ ADĂUGATĂ --- */}
                        <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ title: 'Adăugare Produs', headerShown: false }} />

                        <Stack.Screen name="SupplierReturnsScreen" component={SupplierReturnsScreen} options={{ title: 'Retur Furnizor', headerShown: false }} />
                        <Stack.Screen name="TeamScreen" component={TeamScreen} options={{ title: 'Gestionare Echipă' }} />
                        <Stack.Screen name="SupplierScreens" component={SupplierScreens} options={{ title: 'Furnizori' }} />
                        <Stack.Screen name="ReportsScreen" component={ReportsScreen} options={{ title: 'Rapoarte' }} />
                        <Stack.Screen name="SettingsScreen" component={SettingsScreen} options={{ title: 'Setări Sistem' }} />
                        <Stack.Screen name="AdminLogsScreen" component={AdminLogsScreen} options={{ title: 'Jurnal Erori' }} />
                        <Stack.Screen name="ReceiptsHistoryScreen" component={ReceiptsHistoryScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="AdminQuickAddScreen" component={AdminQuickAddScreen} options={{ headerShown: false }} />

                        {/* Secțiunea Agent */}
                        <Stack.Screen name="AgentSupplyOrderScreen" component={AgentSupplyOrderScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="AgentSupplyHistoryScreen" component={AgentSupplyHistoryScreen} options={{ title: 'Istoric Comenzi' }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}