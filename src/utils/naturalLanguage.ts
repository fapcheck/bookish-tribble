// Natural language date parser for Russian
// Parses strings like "завтра 15:00", "сегодня вечером", "через 2 дня", etc.

interface ParseResult {
    deadline?: number; // ms timestamp
    priority?: "low" | "normal" | "high";
    tags?: string[];
    cleanTitle: string;
}

const timePatterns: Record<string, () => Date> = {
    "сейчас": () => new Date(),
    "сегодня": () => {
        const d = new Date();
        d.setHours(18, 0, 0, 0); // Default to 6pm
        return d;
    },
    "завтра": () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d;
    },
    "послезавтра": () => {
        const d = new Date();
        d.setDate(d.getDate() + 2);
        d.setHours(9, 0, 0, 0);
        return d;
    },
    "вечером": () => {
        const d = new Date();
        d.setHours(19, 0, 0, 0);
        return d;
    },
    "утром": () => {
        const d = new Date();
        if (d.getHours() >= 12) d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d;
    },
    "в понедельник": () => getNextWeekday(1),
    "во вторник": () => getNextWeekday(2),
    "в среду": () => getNextWeekday(3),
    "в четверг": () => getNextWeekday(4),
    "в пятницу": () => getNextWeekday(5),
    "в субботу": () => getNextWeekday(6),
    "в воскресенье": () => getNextWeekday(0),
};

function getNextWeekday(targetDay: number): Date {
    const d = new Date();
    const currentDay = d.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    d.setDate(d.getDate() + daysUntil);
    d.setHours(9, 0, 0, 0);
    return d;
}

const priorityPatterns: Record<string, "low" | "normal" | "high"> = {
    "важно": "high",
    "срочно": "high",
    "высокий приоритет": "high",
    "!": "high",
    "!!": "high",
    "низкий приоритет": "low",
    "не срочно": "low",
};

export function parseNaturalLanguage(input: string): ParseResult {
    let text = input.trim();
    let deadline: number | undefined;
    let priority: "low" | "normal" | "high" | undefined;
    let tags: string[] = [];

    // Extract time patterns (e.g., "15:30" or "15 30")
    const timeMatch = text.match(/(\d{1,2})[:\s](\d{2})/);
    let hours: number | undefined;
    let minutes: number | undefined;
    if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            text = text.replace(timeMatch[0], "").trim();
        } else {
            hours = undefined;
            minutes = undefined;
        }
    }

    // Extract tags (#tag)
    const tagMatches = text.match(/#[а-яА-Яa-zA-Z0-9_]+/g);
    if (tagMatches) {
        tags = tagMatches.map((t) => t.substring(1));
        for (const t of tagMatches) {
            text = text.replace(t, "").trim();
        }
    }

    // Extract priority
    for (const [pattern, p] of Object.entries(priorityPatterns)) {
        if (text.toLowerCase().includes(pattern)) {
            priority = p;
            text = text.replace(new RegExp(pattern, "gi"), "").trim();
            break;
        }
    }

    // Extract "через X (дней/часов)"
    const throughMatch = text.match(/через\s+(\d+)\s*(дн|день|дня|часов?|час|минут|мин)/i);
    if (throughMatch) {
        const amount = parseInt(throughMatch[1], 10);
        const unit = throughMatch[2].toLowerCase();
        const d = new Date();

        if (unit.startsWith("дн") || unit.startsWith("день")) {
            d.setDate(d.getDate() + amount);
            d.setHours(hours ?? 9, minutes ?? 0, 0, 0);
        } else if (unit.startsWith("час")) {
            d.setHours(d.getHours() + amount, minutes ?? 0, 0, 0);
        } else if (unit.startsWith("мин")) {
            d.setMinutes(d.getMinutes() + amount);
        }

        deadline = d.getTime();
        text = text.replace(throughMatch[0], "").trim();
    }

    // Extract date keywords
    if (!deadline) {
        for (const [pattern, getDate] of Object.entries(timePatterns)) {
            if (text.toLowerCase().includes(pattern)) {
                const d = getDate();
                if (hours !== undefined && minutes !== undefined) {
                    d.setHours(hours, minutes, 0, 0);
                }
                deadline = d.getTime();
                text = text.replace(new RegExp(pattern, "gi"), "").trim();
                break;
            }
        }
    }

    // If we have time but no date, use today/tomorrow based on time
    if (hours !== undefined && minutes !== undefined && !deadline) {
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        if (d.getTime() < Date.now()) {
            d.setDate(d.getDate() + 1); // Tomorrow if time already passed
        }
        deadline = d.getTime();
    }

    // Clean up extra spaces
    text = text.replace(/\s+/g, " ").trim();

    return {
        deadline,
        priority,
        tags: tags.length > 0 ? tags : undefined,
        cleanTitle: text,
    };
}
