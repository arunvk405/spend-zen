import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Modal, Platform, ActivityIndicator, Pressable, Alert
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useFinance } from '../src/context/FinanceContext';
import { useThemeColors } from '../src/theme/colors';
import { BankAccountWithBalance, CreditCardWithBalance, ACCOUNT_COLORS } from '../src/models';
import {
    ArrowLeft, Plus, Trash2, Edit3, X, Landmark, CreditCard,
    Check, AlertCircle, Calendar
} from 'lucide-react-native';
import { format } from 'date-fns';

// ─── Color Picker ────────────────────────────────────────────────────────────
const ColorPicker = ({ selected, onSelect }: { selected: string; onSelect: (c: string) => void }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
        {ACCOUNT_COLORS.map(c => (
            <Pressable key={c} onPress={() => onSelect(c)}
                style={[colorPickerStyles.dot, { backgroundColor: c },
                selected === c && colorPickerStyles.dotSelected]}>
                {selected === c && <Check size={14} color="#fff" />}
            </Pressable>
        ))}
    </View>
);

const colorPickerStyles = StyleSheet.create({
    dot: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    dotSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },
});

// ─── Bank Account Modal ───────────────────────────────────────────────────────
const ACCOUNT_TYPES = ['Savings', 'Current', 'Salary', 'Other'] as const;

function BankAccountModal({ visible, onClose, existing }: {
    visible: boolean; onClose: () => void; existing?: BankAccountWithBalance;
}) {
    const Colors = useThemeColors();
    const { addBankAccount, updateBankAccount } = useFinance();
    const [bankName, setBankName] = useState(existing?.bankName || '');
    const [accountType, setAccountType] = useState<typeof ACCOUNT_TYPES[number]>(existing?.accountType || 'Savings');
    const [color, setColor] = useState(existing?.color || ACCOUNT_COLORS[1]);
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        if (visible) {
            setBankName(existing?.bankName || '');
            setAccountType(existing?.accountType || 'Savings');
            setColor(existing?.color || ACCOUNT_COLORS[1]);
        }
    }, [visible]);

    const handleSave = async () => {
        if (!bankName.trim()) return;
        setSaving(true);
        try {
            const data = { bankName: bankName.trim(), accountType, initialBalance: 0, color };
            if (existing) await updateBankAccount(existing.id, data);
            else await addBankAccount(data);
            onClose();
        } finally { setSaving(false); }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={modal.overlay} onPress={onClose}>
                <Pressable style={[modal.sheet, { backgroundColor: Colors.background }]} onPress={() => {}}>
                    <View style={[modal.header, { borderBottomColor: Colors.border }]}>
                        <Text style={[modal.title, { color: Colors.text }]}>{existing ? 'Edit Bank Account' : 'Add Bank Account'}</Text>
                        <Pressable onPress={onClose}><X size={22} color={Colors.textMuted} /></Pressable>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={[modal.label, { color: Colors.textMuted }]}>Bank Name *</Text>
                        <TextInput style={[modal.input, { backgroundColor: Colors.surface, color: Colors.text, borderColor: Colors.border }]}
                            value={bankName} onChangeText={setBankName} placeholder="e.g. HDFC, SBI, ICICI" placeholderTextColor={Colors.textMuted} />

                        <Text style={[modal.label, { color: Colors.textMuted }]}>Account Type</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                            {ACCOUNT_TYPES.map(t => (
                                <Pressable key={t} onPress={() => setAccountType(t)}
                                    style={[modal.chip, { borderColor: accountType === t ? color : Colors.border, backgroundColor: accountType === t ? color + '20' : Colors.surface }]}>
                                    <Text style={{ color: accountType === t ? color : Colors.textMuted, fontWeight: '600', fontSize: 13 }}>{t}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={[modal.label, { color: Colors.textMuted }]}>Color</Text>
                        <ColorPicker selected={color} onSelect={setColor} />

                        <Pressable onPress={handleSave} disabled={saving || !bankName.trim()}
                            style={[modal.saveBtn, { backgroundColor: saving || !bankName.trim() ? Colors.border : color }]}>
                            {saving ? <ActivityIndicator color="#fff" size="small" /> :
                                <Text style={modal.saveBtnText}>{existing ? 'Update Account' : 'Add Account'}</Text>}
                        </Pressable>
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// ─── Credit Card Modal ────────────────────────────────────────────────────────
function CreditCardModal({ visible, onClose, existing }: {
    visible: boolean; onClose: () => void; existing?: CreditCardWithBalance;
}) {
    const Colors = useThemeColors();
    const { addCreditCard, updateCreditCard } = useFinance();
    const [cardName, setCardName] = useState(existing?.cardName || '');
    const [creditLimit, setCreditLimit] = useState(existing?.creditLimit?.toString() || '');
    const [dueDay, setDueDay] = useState(existing?.dueDay?.toString() || '1');
    const [color, setColor] = useState(existing?.color || ACCOUNT_COLORS[4]);
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        if (visible) {
            setCardName(existing?.cardName || '');
            setCreditLimit(existing?.creditLimit?.toString() || '');
            setDueDay(existing?.dueDay?.toString() || '1');
            setColor(existing?.color || ACCOUNT_COLORS[4]);
        }
    }, [visible]);

    const handleSave = async () => {
        if (!cardName.trim() || !creditLimit || !dueDay) return;
        setSaving(true);
        try {
            const data = { 
                cardName: cardName.trim(), 
                creditLimit: parseFloat(creditLimit) || 0, 
                dueDay: parseInt(dueDay) || 1, 
                color 
            };
            if (existing) await updateCreditCard(existing.id, data);
            else await addCreditCard(data);
            onClose();
        } finally { setSaving(false); }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={modal.overlay} onPress={onClose}>
                <Pressable style={[modal.sheet, { backgroundColor: Colors.background }]} onPress={() => {}}>
                    <View style={[modal.header, { borderBottomColor: Colors.border }]}>
                        <Text style={[modal.title, { color: Colors.text }]}>{existing ? 'Edit Credit Card' : 'Add Credit Card'}</Text>
                        <Pressable onPress={onClose}><X size={22} color={Colors.textMuted} /></Pressable>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={[modal.label, { color: Colors.textMuted }]}>Card Name *</Text>
                        <TextInput style={[modal.input, { backgroundColor: Colors.surface, color: Colors.text, borderColor: Colors.border }]}
                            value={cardName} onChangeText={setCardName} placeholder="e.g. HDFC Millenia, SBI Simply" placeholderTextColor={Colors.textMuted} />

                        <Text style={[modal.label, { color: Colors.textMuted }]}>Credit Limit (₹) *</Text>
                        <TextInput style={[modal.input, { backgroundColor: Colors.surface, color: Colors.text, borderColor: Colors.border }]}
                            value={creditLimit} onChangeText={t => setCreditLimit(t.replace(/[^0-9.]/g, ''))}
                            keyboardType="decimal-pad" placeholder="e.g. 100000" placeholderTextColor={Colors.textMuted} />

                        <Text style={[modal.label, { color: Colors.textMuted }]}>Monthly Due Day (1-31)</Text>
                        <TextInput style={[modal.input, { backgroundColor: Colors.surface, color: Colors.text, borderColor: Colors.border }]}
                            value={dueDay} onChangeText={t => {
                                const val = parseInt(t);
                                if (!t || (val >= 1 && val <= 31)) setDueDay(t.replace(/[^0-9]/g, ''));
                            }}
                            keyboardType="number-pad" placeholder="e.g. 15" placeholderTextColor={Colors.textMuted} />

                        <Text style={[modal.label, { color: Colors.textMuted }]}>Color</Text>
                        <ColorPicker selected={color} onSelect={setColor} />

                        <Pressable onPress={handleSave} disabled={saving || !cardName.trim() || !creditLimit}
                            style={[modal.saveBtn, { backgroundColor: saving || !cardName.trim() || !creditLimit ? Colors.border : color }]}>
                            {saving ? <ActivityIndicator color="#fff" size="small" /> :
                                <Text style={modal.saveBtnText}>{existing ? 'Update Card' : 'Add Card'}</Text>}
                        </Pressable>
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ManageAccounts() {
    const Colors = useThemeColors();
    const router = useRouter();
    const { 
        bankAccounts, 
        creditCards, 
        deleteBankAccount, 
        deleteCreditCard,
        cashAccountName,
        renameCashAccount
    } = useFinance();

    const [tab, setTab] = useState<'bank' | 'credit'>('bank');
    const [showBankModal, setShowBankModal] = useState(false);
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [editingBank, setEditingBank] = useState<BankAccountWithBalance | undefined>();
    const [editingCredit, setEditingCredit] = useState<CreditCardWithBalance | undefined>();

    const confirmDelete = (label: string, onConfirm: () => void) => {
        if (Platform.OS === 'web') {
            if (window.confirm(`Delete "${label}"? All transactions for this account will remain but won't be linked.`)) onConfirm();
        } else {
            Alert.alert('Delete', `Delete "${label}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: onConfirm },
            ]);
        }
    };

    const handleRenameCash = () => {
        const newName = window.prompt("Rename Cash Account:", cashAccountName);
        if (newName && newName.trim()) {
            renameCashAccount(newName.trim());
        }
    };

    return (
        <View style={[s.container, { backgroundColor: Colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Header */}
            <View style={[s.header, { borderBottomColor: Colors.border }]}>
                <Pressable onPress={() => router.back()} style={s.backBtn}>
                    <ArrowLeft size={24} color={Colors.text} />
                </Pressable>
                <Text style={[s.headerTitle, { color: Colors.text }]}>Manage Accounts</Text>
                <Pressable onPress={() => {
                    if (tab === 'bank') { setEditingBank(undefined); setShowBankModal(true); }
                    else { setEditingCredit(undefined); setShowCreditModal(true); }
                }} style={[s.addBtn, { backgroundColor: Colors.primary }]}>
                    <Plus size={20} color="#fff" />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
                {/* Cash Account Rename Section */}
                <View style={[s.section, { marginBottom: 20 }]}>
                    <Text style={[s.sectionTitle, { color: Colors.textMuted }]}>Cash Account</Text>
                    <View style={[s.card, { backgroundColor: Colors.surface, borderLeftColor: '#4CAF50' }]}>
                        <View style={[s.cardIcon, { backgroundColor: '#4CAF5020' }]}>
                            <Landmark size={20} color="#4CAF50" />
                        </View>
                        <View style={s.cardInfo}>
                            <Text style={[s.cardName, { color: Colors.text }]}>{cashAccountName}</Text>
                            <Text style={[s.cardSub, { color: Colors.textMuted }]}>Fixed Account (Physical Cash)</Text>
                        </View>
                        <View style={s.actions}>
                            <TouchableOpacity onPress={handleRenameCash} style={[s.actionBtn, { backgroundColor: Colors.background, borderRadius: 8 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
                                    <Edit3 size={14} color={Colors.primary} />
                                    <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '700' }}>Rename</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Tab Bar */}
                <View style={[s.tabBar, { backgroundColor: Colors.surface, borderColor: Colors.border, marginBottom: 16 }]}>
                    {(['bank', 'credit'] as const).map(t => (
                        <Pressable key={t} onPress={() => setTab(t)}
                            style={[s.tab, tab === t && { backgroundColor: Colors.primary }]}>
                            {t === 'bank' ? <Landmark size={16} color={tab === t ? '#fff' : Colors.textMuted} /> :
                                <CreditCard size={16} color={tab === t ? '#fff' : Colors.textMuted} />}
                            <Text style={[s.tabText, { color: tab === t ? '#fff' : Colors.textMuted }]}>
                                {t === 'bank' ? `Bank Accounts` : `Credit Cards`}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {tab === 'bank' ? (
                    <>
                        {bankAccounts.length === 0 && (
                            <View style={[s.emptyBox, { borderColor: Colors.border }]}>
                                <Landmark size={36} color={Colors.textMuted} />
                                <Text style={[s.emptyText, { color: Colors.textMuted }]}>No bank accounts yet.{'\n'}Tap + to add one.</Text>
                            </View>
                        )}
                        {bankAccounts.map(acc => (
                            <View key={acc.id} style={[s.card, { backgroundColor: Colors.surface, borderLeftColor: acc.color }]}>
                                <View style={[s.cardIcon, { backgroundColor: acc.color + '20' }]}>
                                    <Landmark size={20} color={acc.color} />
                                </View>
                                <View style={s.cardInfo}>
                                    <Text style={[s.cardName, { color: Colors.text }]}>{acc.bankName}</Text>
                                    <Text style={[s.cardSub, { color: Colors.textMuted }]}>{acc.accountType} Account</Text>
                                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                                        <View>
                                            <Text style={[s.metaLabel, { color: Colors.textMuted }]}>Balance</Text>
                                            <Text style={[s.metaVal, { color: Colors.income }]}>₹{acc.computedBalance.toLocaleString()}</Text>
                                        </View>
                                        <View>
                                            <Text style={[s.metaLabel, { color: Colors.textMuted }]}>Opening</Text>
                                            <Text style={[s.metaVal, { color: Colors.text }]}>₹{acc.initialBalance.toLocaleString()}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={s.actions}>
                                    <TouchableOpacity onPress={() => { setEditingBank(acc); setShowBankModal(true); }} style={[s.actionBtn, { backgroundColor: Colors.background, borderRadius: 8 }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
                                            <Edit3 size={14} color={Colors.primary} />
                                            <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '700' }}>Edit</Text>
                                        </View>
                                    </TouchableOpacity>
                                    <Pressable onPress={() => confirmDelete(acc.bankName, () => deleteBankAccount(acc.id))} style={s.actionBtn}>
                                        <Trash2 size={16} color={Colors.expense} />
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                    </>
                ) : (
                    <>
                        {creditCards.length === 0 && (
                            <View style={[s.emptyBox, { borderColor: Colors.border }]}>
                                <CreditCard size={36} color={Colors.textMuted} />
                                <Text style={[s.emptyText, { color: Colors.textMuted }]}>No credit cards yet.{'\n'}Tap + to add one.</Text>
                            </View>
                        )}
                        {creditCards.map(card => (
                            <View key={card.id} style={[s.card, { backgroundColor: Colors.surface, borderLeftColor: card.color }]}>
                                <View style={[s.cardIcon, { backgroundColor: card.color + '20' }]}>
                                    <CreditCard size={20} color={card.color} />
                                </View>
                                <View style={s.cardInfo}>
                                    <Text style={[s.cardName, { color: Colors.text }]}>{card.cardName}</Text>
                                    <Text style={[s.cardSub, { color: Colors.textMuted }]}>
                                        Due on {card.dueDay}{[1, 21, 31].includes(card.dueDay) ? 'st' : [2, 22].includes(card.dueDay) ? 'nd' : [3, 23].includes(card.dueDay) ? 'rd' : 'th'} of month
                                    </Text>
                                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                                        <View>
                                            <Text style={[s.metaLabel, { color: Colors.textMuted }]}>Limit</Text>
                                            <Text style={[s.metaVal, { color: Colors.text }]}>₹{card.creditLimit.toLocaleString()}</Text>
                                        </View>
                                        <View>
                                            <Text style={[s.metaLabel, { color: Colors.textMuted }]}>Available</Text>
                                            <Text style={[s.metaVal, { color: Colors.income }]}>₹{card.availableBalance.toLocaleString()}</Text>
                                        </View>
                                        <View>
                                            <Text style={[s.metaLabel, { color: Colors.textMuted }]}>Due</Text>
                                            <Text style={[s.metaVal, { color: card.dueAmount > 0 ? Colors.expense : Colors.income }]}>
                                                ₹{card.dueAmount.toLocaleString()}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={s.actions}>
                                    <TouchableOpacity onPress={() => { setEditingCredit(card); setShowCreditModal(true); }} style={[s.actionBtn, { backgroundColor: Colors.background, borderRadius: 8 }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
                                            <Edit3 size={14} color={Colors.primary} />
                                            <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '700' }}>Edit</Text>
                                        </View>
                                    </TouchableOpacity>
                                    <Pressable onPress={() => confirmDelete(card.cardName, () => deleteCreditCard(card.id))} style={s.actionBtn}>
                                        <Trash2 size={16} color={Colors.expense} />
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                    </>
                )}

                <View style={[s.infoBox, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
                    <AlertCircle size={14} color={Colors.textMuted} />
                    <Text style={[s.infoText, { color: Colors.textMuted }]}>
                        {tab === 'bank'
                            ? 'Bank account balance = Opening balance + all income − all expenses recorded for that account.'
                            : 'Credit card balance is tracked from transactions. Use income transactions on a card to record payments.'
                        }
                    </Text>
                </View>
            </ScrollView>

            <BankAccountModal visible={showBankModal} onClose={() => { setShowBankModal(false); setEditingBank(undefined); }} existing={editingBank} />
            <CreditCardModal visible={showCreditModal} onClose={() => { setShowCreditModal(false); setEditingCredit(undefined); }} existing={editingCredit} />
        </View>
    );
}

const modal = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '90%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, marginBottom: 20 },
    title: { fontSize: 20, fontWeight: '700' },
    label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 16 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 4 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
    saveBtn: { marginTop: 28, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

const s = StyleSheet.create({
    container: { flex: 1 },
    section: { marginTop: 8 },
    sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    backBtn: { padding: 8, marginLeft: -8 },
    addBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    tabBar: { flexDirection: 'row', margin: 16, borderRadius: 16, padding: 4, borderWidth: 1, gap: 4 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
    tabText: { fontSize: 13, fontWeight: '600' },
    list: { paddingHorizontal: 16, paddingBottom: 60 },
    card: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 12, borderLeftWidth: 4 },
    cardIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardInfo: { flex: 1 },
    cardName: { fontSize: 15, fontWeight: '700' },
    cardSub: { fontSize: 12, marginTop: 2 },
    metaLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    metaVal: { fontSize: 14, fontWeight: '700', marginTop: 1 },
    actions: { gap: 8 },
    actionBtn: { padding: 6 },
    emptyBox: { alignItems: 'center', padding: 40, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', gap: 12, marginVertical: 20 },
    emptyText: { textAlign: 'center', fontSize: 14, lineHeight: 22 },
    infoBox: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 8, alignItems: 'flex-start' },
    infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
