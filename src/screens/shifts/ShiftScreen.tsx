import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, TextField, Button, MenuItem,
    Card, CardContent, Chip, IconButton
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, AccessTime as TimeIcon } from '@mui/icons-material';
import { fetchUsers } from '../../services/userService';
import { fetchShifts, addShift, deleteShift, Shift } from '../../services/shiftService';
import { User } from '../../types';

export const ShiftScreen = () => {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    // Formular
    const [selectedUser, setSelectedUser] = useState('');
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('16:00');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const s = await fetchShifts();
        setShifts(s);
        const u = await fetchUsers();
        setUsers(u);
    };

    const handleSave = async () => {
        if (!selectedUser || !date || !startTime || !endTime) {
            alert("Completează toate câmpurile!");
            return;
        }

        // Construim datele complete (Data + Ora) pentru SQL
        // Formatul trebuie să fie ISO: "YYYY-MM-DDTHH:MM:00"
        const startIso = `${date}T${startTime}:00`;
        const endIso = `${date}T${endTime}:00`;

        try {
            await addShift({
                user_id: Number(selectedUser),
                data_inceput: startIso,
                data_sfarsit: endIso
            });
            loadData(); // Reîmprospătăm lista
            // Resetăm doar utilizatorul, poate vrem să punem mai multe ture pe aceeași dată
            setSelectedUser('');
        } catch (error) {
            alert("Eroare la salvare.");
            console.error(error);
        }
    };

    const handleDelete = async (id: number) => {
        if(confirm("Ștergi această tură?")) {
            await deleteShift(id);
            loadData();
        }
    };

    // Helper pentru formatare data prietenoasă
    const formatDate = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleString('ro-RO', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h4" gutterBottom>Planificare Ture</Typography>

            <Grid container spacing={3}>
                {/* PARTEA 1: FORMULAR ADĂUGARE */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Programare Nouă</Typography>

                        <TextField
                            select label="Angajat" fullWidth margin="normal"
                            value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}
                        >
                            {users.map(u => (
                                <MenuItem key={u.id} value={u.id}>{u.nume} ({u.rol})</MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            type="date" label="Data" fullWidth margin="normal"
                            InputLabelProps={{ shrink: true }}
                            value={date} onChange={(e) => setDate(e.target.value)}
                        />

                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    type="time" label="De la" fullWidth margin="normal"
                                    InputLabelProps={{ shrink: true }}
                                    value={startTime} onChange={(e) => setStartTime(e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    type="time" label="Până la" fullWidth margin="normal"
                                    InputLabelProps={{ shrink: true }}
                                    value={endTime} onChange={(e) => setEndTime(e.target.value)}
                                />
                            </Grid>
                        </Grid>

                        <Button
                            variant="contained" fullWidth sx={{ mt: 3 }}
                            startIcon={<AddIcon />} onClick={handleSave}
                        >
                            Adaugă Tură
                        </Button>
                    </Paper>
                </Grid>

                {/* PARTEA 2: LISTA TURELOR */}
                <Grid item xs={12} md={8}>
                    <Grid container spacing={2}>
                        {shifts.map((shift) => (
                            <Grid item xs={12} sm={6} key={shift.id}>
                                <Card variant="outlined">
                                    <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="h6">{shift.utilizatori?.nume}</Typography>
                                            <Box display="flex" alignItems="center" gap={1} color="text.secondary" mt={1}>
                                                <TimeIcon fontSize="small" />
                                                <Typography variant="body2">
                                                    {formatDate(shift.data_inceput)} - {new Date(shift.data_sfarsit).toLocaleTimeString('ro-RO', {hour: '2-digit', minute:'2-digit'})}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <IconButton color="error" onClick={() => handleDelete(shift.id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}

                        {shifts.length === 0 && (
                            <Typography sx={{ p: 3, color: 'gray' }}>Nu există ture programate.</Typography>
                        )}
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
};