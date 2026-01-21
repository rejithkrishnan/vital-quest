import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGoalsStore } from '@/stores/goalsStore';
import { Ionicons } from '@expo/vector-icons';

export default function DailyBriefingWidget() {
    const { dailyPlan, tasks } = useGoalsStore();
    const [warningLevel, setWarningLevel] = useState<'none' | 'warning' | 'critical'>('none');
    const [warningMessage, setWarningMessage] = useState<string | null>(null);

    useEffect(() => {
        checkForLateTasks();
        const interval = setInterval(checkForLateTasks, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [tasks]);

    const checkForLateTasks = () => {
        if (!tasks) return;
        const now = new Date();

        // Find most delayed task
        let maxDelay = 0;
        let worstTask = null;

        tasks.forEach(t => {
            if (t.is_completed) return;

            // Allow flexibility in time format parsing
            const timeParts = t.time_slot.match(/(\d+):(\d+)/);
            if (!timeParts) return;

            let h = parseInt(timeParts[1]);
            const m = parseInt(timeParts[2]);

            // Handle AM/PM if present (simple check)
            if (t.time_slot.toLowerCase().includes('pm') && h < 12) h += 12;
            if (t.time_slot.toLowerCase().includes('am') && h === 12) h = 0;

            const taskDate = new Date();
            taskDate.setHours(h, m, 0, 0);

            // Calculate difference in hours
            const diffMs = now.getTime() - taskDate.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            if (diffHours > maxDelay) {
                maxDelay = diffHours;
                worstTask = t;
            }
        });

        if (worstTask && maxDelay >= 6) {
            setWarningLevel('critical');
            setWarningMessage(`CRITICAL: You missed "${worstTask.description}" by over 6 hours! Please prioritize this.`);
        } else if (worstTask && maxDelay >= 3) {
            setWarningLevel('warning');
            setWarningMessage(`You missed "${worstTask.description}" scheduled for ${worstTask.time_slot}. Try to catch up!`);
        } else {
            setWarningLevel('none');
            setWarningMessage(null);
        }
    };

    const getDisplayMessage = () => {
        if (warningMessage) return warningMessage;

        // Immediate check for completion (overrides stale AI summaries)
        const completed = tasks ? tasks.filter(t => t.is_completed).length : 0;
        const total = tasks ? tasks.length : 0;

        if (total > 0 && completed === total) {
            return "Mission Accomplished! You've crushed every task today. Outstanding work! 🌟";
        }

        if (dailyPlan?.summary && dailyPlan.summary !== "Pending AI generation" && dailyPlan.summary !== "Day 1 Kickoff") {
            return dailyPlan.summary;
        }

        // Fallback Client Logic
        if (!tasks || tasks.length === 0) return "Ready to start your day? Let's load some tasks.";
        return `You've completed ${completed}/${total} tasks. Keep going!`;
    };

    // Determine style based on state
    let containerStyle = styles.normalContainer;
    let iconName: any = "sparkles";
    let iconColor = "#4285F4"; // Blue-500
    let titleColor = "#1E40AF"; // Blue-800
    let textColor = "#374151";
    let titleText = "Daily Briefing";

    const completed = tasks ? tasks.filter(t => t.is_completed).length : 0;
    const total = tasks ? tasks.length : 0;
    const isAllDone = total > 0 && completed === total;

    if (warningLevel === 'warning') {
        containerStyle = styles.warningContainer;
        iconName = "warning";
        iconColor = "#D97706";
        titleColor = "#92400E";
        textColor = "#78350F";
        titleText = "Attention Needed";
    } else if (warningLevel === 'critical') {
        containerStyle = styles.criticalContainer;
        iconName = "alert-circle";
        iconColor = "#DC2626";
        titleColor = "#991B1B";
        textColor = "#7F1D1D";
        titleText = "Action Required";
    } else if (isAllDone) {
        containerStyle = styles.successContainer;
        iconName = "trophy";
        iconColor = "#059669"; // Emerald-600
        titleColor = "#064E3B"; // Emerald-800
        textColor = "#065F46"; // Emerald-900
        titleText = "All Goals Met";
    }

    return (
        <View style={[styles.container, containerStyle]}>
            <View style={styles.header}>
                <Ionicons name={iconName} size={20} color={iconColor} />
                <Text style={[styles.title, { color: titleColor }]}>
                    {titleText}
                </Text>
            </View>
            <Text style={[styles.message, { color: textColor }]}>
                {getDisplayMessage()}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    normalContainer: {
        backgroundColor: '#EFF6FF', // blue-50
        borderColor: '#DBEAFE', // blue-100
    },
    warningContainer: {
        backgroundColor: '#FFFBEB', // amber-50
        borderColor: '#FEF3C7', // amber-100
    },
    criticalContainer: {
        backgroundColor: '#FEF2F2', // red-50
        borderColor: '#FCA5A5', // red-300
    },
    successContainer: {
        backgroundColor: '#ECFDF5', // emerald-50
        borderColor: '#D1FAE5', // emerald-100
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    message: {
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '500',
    },
});
