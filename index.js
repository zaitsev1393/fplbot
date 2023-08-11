const moment = require("moment");
const _ = require("lodash");
const path = require("path");
const rp = require("request-promise");

moment.locale("ru");

let fplUri = "https://fantasy.premierleague.com/api/bootstrap-static/";
const Telegraf = require("telegraf");
const bot = new Telegraf("1454585916:AAEdexlqh8jVjOjUSup6zd_-p_UYrdSmfqA");

let typeVoc = {
  GKP: {
    name: "ГК",
    icon: "🥅",
  },
  DEF: {
    name: "ЗАЩ",
    icon: "🛡️",
  },
  MID: {
    name: "ПЗ",
    icon: "⚒️",
  },
  FWD: {
    name: "НАП",
    icon: "⚔️",
  },
};

let isFilteringAbbrs = false;

const abbrVoc = {
  "Доминик Калверт-Люин": ["ДКЛ", "DCL"],
  "Кевин Де Брюйне": ["КДБ", "KDB"],
  "Эмиль Смит-Роу": ["ESR", "ЭСР"],
  "Кайл Уокер-Питерс": ["KWP", "КУП", "КВП"],
  "Трент Александер-Арнольд": ["TAA", "ТАА"],
  "Аарон Ван-Бисака": ["AWB", "АВБ"],
  "Андре-Франк Замбо-Ангисса": ["AFZA", "АФЗА", "Замбо"],
  "Джеймс Уорд-Проуз": ["JWP", "ДУП", "ДВП"],
  "Пьер-Эмерик Обамеянг": ["ПЭО", "PEA", "Обама"],
  "Пьер-Эмиль Хёйбьерг": ["PEH", "ПЭХ"],
  "Анвар Эль-Гази": ["AEG", "АЭГ"],
  "Бруну Фернандеш": ["Пенандеш"],
  Арсенал: ["АРС", "ARS", "AFC"],
  "Джейми Варди": ["Алкаш"],
  "Джеймс Мэддисон": ["Мэддо", "Мэд"],
  "Астон Вилла": ["AVFC", "AV", "АВ", "АВФК"],
  "Брайтон & Хоув Альбион": ["BHA", "БХА", "Чайки"],
  Бёрнли: ["BFC", "БФК"],
  Челси: ["ЧФК", "CFC", "CHE", "Пенсы"],
  "Кристал Пэлас": ["КПФК", "CPFC", "KPFC", "CP"],
  Эвертон: ["ЭФК", "EFC", "EVE", "Ириски"],
  Фулхэм: ["ФФК", "FFC", "FUL", "Дачники"],
  "Лидс Юнайтед": ["LEE", "LUFC", "ЛЮФК"],
  "Лестер Сити": ["LEI", "LCFC", "ЛСФК", "Лисы"],
  Ливерпуль: ["LFC", "Ливер", "Колбаса", "Красные", "ЛФК"],
  "Манчестер Сити": ["Сити", "MC", "МС", "Сити"],
  "Манчестер Юнайтед": ["МЮ", "MU", "MUN", "Манки", "Красные дьяволы"],
  "Ньюкасл Юнайтед": ["NU", "NUFC", "НЮ", "NEW"],
  "Шеффилд Юнайтед": ["ШЮФК", "SUFC", "SHU"],
  Саутгемптон: ["СФК", "SFC", "S'ton", "SOU", "Святые", "Сотон"],
  "Тоттенхэм Хотспурс": [
    "ТХ",
    "ТТХ",
    "TH",
    "TOT",
    "Шпоры",
    "Петухи",
    "Курятник",
  ],
  "Вест Бромвич Альбион": ["WBA", "ВБА", "Мешочники"],
  "Вест Хэм Юнайтед": ["ВХЮФС", "ВХ", "WHUFC", "WHU", "Молотки"],
  "Вулверхэмптон Уондерерс": ["ВУ", "Волки", "WOL", "WW", "Wolves"],
};

let abbrValues = [];

Object.values(abbrVoc).forEach((abbrs) =>
  abbrs.forEach((abbr) => abbrValues.push(abbr.toLowerCase()))
);

bot.command("filter", (ctx) => {
  let param = ctx.update.message.text.replace("/filter ", "");
  if (param === "on") isFilteringAbbrs = true;
  if (param === "off") isFilteringAbbrs = false;
  console.log("filtering abbrs: ", isFilteringAbbrs);
});
//
bot.command("abbr", (ctx) => {
  if (!ctx.update.message.text.split(" ")[1]) return;
  let word = ctx.update.message.text.replace("/abbr ", "").toLowerCase();

  console.log(word);

  for (let fullName in abbrVoc) {
    if (abbrVoc[fullName].map((abbr) => abbr.toLowerCase()).includes(word)) {
      ctx.reply(`${word} = ${fullName}`);
    }
  }
});

bot.command("info", (ctx) => {
  ctx.reply(`🍆🍆🍆 Гляди: 🍆🍆🍆
   
        /tur - показати коли ти знову проїбеш поставити кепа
        /player Salah - показати інфу про перспективного гравця
        /gw 2 - інфа про другий тур
        /abbr - розширфувати абревіатуру
        /calendar - здогадайся що це
    
    `);
});

bot.command("stats", async (ctx) => {
  let stats = await getFplStats();
});

bot.command("managers", async (ctx) => {
  let stats = await getFplStats();
  ctx.reply(
    `Целых ${stats.total_players} долбоебов не знают, что делать со своей жизнью.`
  );
});

function getGkInfo(info) {
  return `
Пропущено голов: ${info.goals_conceded} 😩
Сейвы: ${info.saves} (${Math.floor(info.saves / 3)} очков) 💾
Пеналей отбито: ${info.penalties_saved} 😱
    `;
}

bot.command("player", async (ctx, next) => {
  if (!ctx.update.message.text.split(" ")[1]) return;

  let stats = await getFplStats();
  let playerName = ctx.update.message.text
    .replace("/player ", "")
    .toLowerCase();
  let playerInfo;
  if (playerName.split(" ").length > 1) {
    let parts = playerName.split(" ").map((p) => p.toLowerCase());
    console.log("parts: ", parts);
    playerInfo = stats.elements.find(
      (e) =>
        parts.includes(formatName(e.first_name)) &&
        parts.includes(formatName(e.second_name))
    );
  }
  if (!playerInfo) {
    playerInfo = stats.elements.find(
      (e) =>
        formatName(e.second_name) == playerName ||
        formatName(e.first_name) == playerName
    );
  }
  let playerTypes = stats.element_types;

  if (playerInfo) {
    let playerType =
      typeVoc[
        playerTypes.find((t) => t.id === playerInfo.element_type)
          .singular_name_short
      ];
    ctx.reply(`Информация об игроке:\n
Полное имя: ${playerInfo.first_name} ${playerInfo.second_name} 🖌 ${
      playerInfo.in_dreamteam ? "⭐" : ""
    }
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
${playerType.name === "ГК" ? getGkInfo(playerInfo) : ""}
Стоимость: ${playerInfo.now_cost / 10} 💰
Популярность: ${playerInfo.selected_by_percent}% 📊
        `);
  } else {
    ctx.reply("Та иди ты нахуй со своими выдумками");
  }
});

bot.command("gw", async (ctx) => {
  let stats = await getFplStats();
  let num = +ctx.update.message.text.split(" ")[1];
  if (
    num &&
    Number.isInteger(num) &&
    +num <= +stats.events.find((e) => e.is_current).id &&
    num > 0
  ) {
    let gw = stats.events.find((e) => e.id === num);
    let bestPlayer = stats.elements.find((e) => e.id === gw.top_element);
    let mostSelected = stats.elements.find((e) => e.id === gw.most_selected);
    let mostTrIn = stats.elements.find((e) => e.id === gw.most_transferred_in);
    let mostCaptained = stats.elements.find((e) => e.id === gw.most_captained);
    let mostVC = stats.elements.find((e) => e.id === gw.most_vice_captained);
    ctx.reply(`Информация о туре ${num}: 
        
            Сыгран: ${gw.finished ? "Да" : "Пока нет"} 🎮
            Трансферов: ${gw.transfers_made} ✍️
            
            - Средний счет: ${
              gw.average_entry_score ? gw.average_entry_score : "та короче"
            } 📊
            - Лучший счет: ${gw.highest_score ? gw.highest_score : "отсоси"} 🎯
            
            - Игрок тура: ${bestPlayer.first_name} ${
      bestPlayer.second_name
    } - ${gw.top_element_info.points} очков 🏅🏅🏅
            
            - Самый популярный игрок: ${mostSelected.first_name} ${
      mostSelected.second_name
    } 🌟
            - Самый популярный трансфер: ${mostTrIn.first_name} ${
      mostTrIn.second_name
    } 🍀
            
            🚢 Самый популярный капитан: ${mostCaptained.first_name} ${
      mostCaptained.second_name
    } 🚢
            🛶 Самый популярный вице-капитан: ${mostVC.first_name} ${
      mostVC.second_name
    } 🛶
            
        `);
  } else {
    ctx.reply("Не шали, петушок.");
  }
});

bot.command("tur", (ctx) => {
  getFplStats().then((data) => {
    let gw = data.events.find((gw) => gw.is_next);
    let deadline = gw.deadline_time;
    let deadlineDate = moment(deadline).format("DD MMM YYYY - HH:mm");
    let timeLeft = moment(new Date(deadline)).from(new Date());
    ctx.reply("Дедлайн замін: " + deadlineDate);
    ctx.reply("Початок " + timeLeft + " чи коли Артур подзвонить куди треба");
  });
});

bot.command("injuries", async (ctx) => {
  await ctx.reply("А кто это тут такой не любит одевать щитки???");
  const stats = await getFplStats();
  let data = {};
  let teams = stats.teams.map((e) => ({
    code: e.code,
    name: e.name,
  }));

  const injuredPlayers = stats.elements
    .filter((player) => player.news.includes("injury"))
    .map((player) => ({
      name: player.web_name,
      team: teams.find((t) => t.code === player.team_code).name,
      info: player.news,
    }));

  injuredPlayers.forEach((player) => {
    if (!data[player.team]) {
      data[player.team] = [];
    }
    data[player.team].push(player);
  });

  let injuredInfo = "";

  for (let e in data) {
    injuredInfo += `\n <b> ${e}: </b> \n`;
    data[e].forEach((player) => {
      injuredInfo += ` - ${player.name} - <i> ${player.info} </i> \n`;
    });
  }

  ctx.replyWithHTML(injuredInfo);
});

bot.command("calendar", async (ctx) => {
  let stats = await getFplStats();
  let emojisVoc = [
    "🏆",
    "⚽",
    "🏟️",
    "🇬🇧",
    "🔥",
    "💯",
    "🎖️",
    "🏅",
    "🥅",
    "🎯",
    "🚩",
    "🔪",
    "⏱️",
  ];
  let calendar = "";
  let remainedGameweeks = stats.events
    .filter((e) => new Date(e.deadline_time).getTime() > Date.now())
    .map((e) => ({
      name: e.name,
      deadline: moment(e.deadline_time).format("DD MMM YYYY HH:mm"),
    }));

  remainedGameweeks.forEach((gw) => {
    let emoji = emojisVoc[Math.floor(Math.random() * emojisVoc.length)];
    calendar += `${emoji} <b>${gw.name}</b> - ${gw.deadline} \n`;
  });
  await ctx.reply("Номер тура и дедлайн замен:");
  await ctx.replyWithHTML(calendar);
});

bot.on("text", (ctx) => {
  let message = ctx.update.message.text.toLowerCase();

  if (isFilteringAbbrs) {
    filterAbbrs(ctx);
  }
  if (message.match("бруно|фернандеш")) {
    ctx.reply(`Ты хотел сказать Пенандеш?`);
  }
});

function formatName(name) {
  let newName = name.replace("é", "e");
  newName = newName.toLowerCase();
  return newName;
}

function getFplStats() {
  return rp.get({ uri: fplUri, json: true });
}

bot.launch().then(() => {
  console.log("bot is launched!");
});

async function filterAbbrs(ctx) {
  let splitMessage = ctx.update.message.text.split(/[ ,.]+/g);

  // if(!splitMessage.some(word => abbrValues.includes(word.toLowerCase()))) return;

  for (let i = 0; i < splitMessage.length; i++) {
    for (let option in abbrVoc) {
      if (
        abbrVoc[option]
          .map((w) => w.toLowerCase())
          .includes(splitMessage[i].toLowerCase())
      ) {
        splitMessage[i] = option;
      }
    }
  }

  let formattedMessage = splitMessage.join(" ");

  await ctx.reply(
    `Я увидел тут несколько слов, которые могут расшифровать только люди с трехзначным IQ. Вот перевод:`
  );
  await ctx.reply(formattedMessage);
}
