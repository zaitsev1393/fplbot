const moment = require('moment');
const _ = require('lodash');
const path = require('path');
const rp = require('request-promise');

moment.locale('ru');

let fplUri = "https://fantasy.premierleague.com/api/bootstrap-static/";
const Telegraf = require('telegraf');
const bot = new Telegraf('1454585916:AAEdexlqh8jVjOjUSup6zd_-p_UYrdSmfqA');

let typeVoc = {
    GKP: {
        name: "ГК",
        icon: '🥅'
    },
    DEF: {
        name: "ЗАЩ",
        icon: '🛡️'
    },
    MID: {
        name: "ПЗ",
        icon: '⚒️'
    },
    FWD: {
        name: "НАП",
        icon: '⚔️'
    }
};


bot.command('info', (ctx) => {
    ctx.reply(`🍆🍆🍆 Ну-ка, садись на коленку, а еще лучше - на куканку: расскажу тебе, что я за овощ. 🍆🍆🍆
    
        Жизнь:
        /kurs - узнать, почем фунт лиха
    
        ФПЛ:
        /tur - показать, когда ты в следующий раз забудешь поставить нужного кэпа
        /player Vardy - показать инфу про Варди
        /managers - показать, сколько людей не знают, что такое личная жизнь
        /gw 2 - показать инфу о втором туре
    
    `);
});

bot.command('stats', async (ctx) => {
    let stats = await getFplStats();
});

bot.command('managers', async (ctx) => {
    let stats = await getFplStats();
    ctx.reply(`Целых ${stats.total_players} долбоебов не знают, что делать со своей жизнью.`);
});

function getGkInfo(info) {
    return `
Пропущено голов: ${info.goals_conceded} 😩
Сейвы: ${info.saves} (${Math.floor(info.saves / 3)} очков) 💾
Пеналей отбито: ${info.penalties_saved} 😱
    `
}

bot.command('player', async (ctx, next) => {
    if(!ctx.update.message.text.split(' ')[1])
        return;

    let stats = await getFplStats();
    let playerName = ctx.update.message.text.replace('/player ', '').toLowerCase();
    let playerInfo;
    if(playerName.split(' ').length > 1) {
        let parts = playerName.split(' ').map(p => p.toLowerCase());
        console.log('parts: ', parts);
        playerInfo = stats.elements.find(e => parts.includes(formatName(e.first_name)) && parts.includes(formatName(e.second_name)));
    }
    if(!playerInfo) {
        playerInfo = stats.elements.find(e => formatName(e.second_name) == playerName
            || formatName(e.first_name) == playerName);
    }
    let playerTypes = stats.element_types;

    if(playerInfo) {
        let playerType = typeVoc[playerTypes.find(t => t.id === playerInfo.element_type).singular_name_short];
        ctx.reply(`Информация об игроке:\n
Полное имя: ${playerInfo.first_name} ${playerInfo.second_name} 🖌 ${playerInfo.in_dreamteam ? '⭐' : ''}
Позиция: ${playerType.name} ${playerType.icon}
Новости: ${playerInfo.news || "Нихуя нового"} 📰
Очки: ${playerInfo.total_points} 🎯
Бонусы: ${playerInfo.bonus} 🏅
PPG: ${playerInfo.points_per_game} 🔺
Сыграно: ${playerInfo.minutes}мин. 🕐
Голы: ${playerInfo.goals_scored} ⚽️
Ассисты: ${playerInfo.assists} 👟
КЩ: ${playerInfo.clean_sheets} 🧻
Автоголы: ${playerInfo.own_goals} 👪
Проебано пеналей: ${playerInfo.penalties_missed} 🖕
${playerType.name === 'ГК' ? getGkInfo(playerInfo) : ''}
Стоимость: ${playerInfo.now_cost / 10} 💰
Популярность: ${playerInfo.selected_by_percent}% 📊
        `);
    } else {
        ctx.reply("Та иди ты нахуй со своими выдумками");
    }
});

bot.command('gw', async (ctx) => {
    let stats = await getFplStats();
    let num = +ctx.update.message.text.split(' ')[1];
    if(num && Number.isInteger(num) && +num <= +stats.events.find(e => e.is_current).id && num > 0) {
        let gw = stats.events.find(e => e.id === num);
        let bestPlayer = stats.elements.find(e => e.id === gw.top_element);
        let mostSelected = stats.elements.find(e => e.id === gw.most_selected);
        let mostTrIn = stats.elements.find(e => e.id === gw.most_transferred_in);
        let mostCaptained = stats.elements.find(e => e.id === gw.most_captained);
        let mostVC = stats.elements.find(e => e.id === gw.most_vice_captained);
        ctx.reply(`Информация о туре ${num}: 
        
            Сыгран: ${gw.finished ? 'Да, сука' : 'Пока нет, уебень'} 🎮
            Трансферов: ${gw.transfers_made} ✍️
            
            - Средний счет: ${gw.average_entry_score ? gw.average_entry_score : 'та короче'} 📊
            - Лучший счет: ${gw.highest_score ? gw.highest_score : 'отсоси'} 🎯
            
            - Игрок тура: ${bestPlayer.first_name} ${bestPlayer.second_name} - ${gw.top_element_info.points} очков 🏅🏅🏅
            
            - Самый популярный игрок: ${mostSelected.first_name} ${mostSelected.second_name} 🌟🌟🌟 
            - Самый популярный трансфер: ${mostTrIn.first_name} ${mostTrIn.second_name} 🍀🍀🍀
            
            🚢🚢🚢 Самый популярный капитан: ${mostCaptained.first_name} ${mostCaptained.second_name} 🚢🚢🚢
            🛶🛶🛶 Самый популярный вице-капитан: ${mostVC.first_name} ${mostVC.second_name} 🛶🛶🛶
            
        `);
    } else {
        ctx.reply('Не шали, петушок.')
    }
});

bot.command('tur', (ctx) => {
    ctx.reply('Ща, погодь... Шуршу по журналам Советский Футбол...');
    getFplStats()
        .then(data => {
            let gw = data.events.find(gw => gw.is_next);
            let deadline = gw.deadline_time;
            let deadlineDate = moment(deadline).format('DD MMM YYYY - HH:mm');
            let timeLeft = moment(new Date(deadline)).from(new Date());
            ctx.reply('Дедлайн замен: ' + deadlineDate);
            ctx.reply('Начало ' + timeLeft + ', ебаный ты кусок говна.');
        })
});

function formatName(name) {
    let newName = name.replace("é", "e");
    newName = newName.toLowerCase();
    return newName;
}

function getFplStats() {
    return rp.get({uri: fplUri, json: true});
}

bot.launch().then(() => {
    console.log('bot is launched!')
});