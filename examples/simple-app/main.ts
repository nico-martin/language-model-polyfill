import { LanguageModel as TFLanguageModel } from "../../src";

const output = document.getElementById("output") as HTMLParagraphElement;
const button = document.getElementById("btn") as HTMLButtonElement;
const buttonPromptApi = document.getElementById(
  "btnPromptApi",
) as HTMLButtonElement;

if (button) {
  button.addEventListener("click", async () => {
    console.log("Button clicked");
    const availability = await TFLanguageModel.availability();
    console.log(availability);
    if (availability === "unavailable") {
      alert("Model not available");
      return;
    }

    //const params = await TFLanguageModel.params();

    /*const model = await TFLanguageModel.create({
      monitor(m) {
        m.addEventListener("downloadprogress", (e) => {
          //console.log(`Downloaded ${e.loaded * 100}%`);
        });
      },
      temperature: 1,
      topK: params.defaultTopK,
      initialPrompts: [
        {
          role: "system",
          content: "You are Jonny, a helpful and friendly assistant.",
        },
      ],
    });*/

    const modelTwo = await TFLanguageModel.create({
      temperature: 2,
      initialPrompts: [
        {
          role: "system",
          content: "You are Felix, a helpful and friendly assistant.",
        },
      ],
    });

    const stream = modelTwo.promptStreaming("Write me an extra-long poem!");
    const reader = stream.getReader();

    let reply = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      reply += value;
      output.textContent = reply;
    }

    /*console.log("Who are you?");
    console.log(await model.prompt("Who are you?"));
    console.log("Whats your favourite color?");
    console.log(await model.prompt("Whats your favourite color?"));

    console.log("MODEL TWO");
    for (let i = 1; i <= 100; ++i) {
      console.log(i);
      console.log(
        await modelTwo.prompt(
          "Explain this: Die Deutsche Studentenschaft (DSt) war von 1919 bis 1945 der Zusammenschluss der Allgemeinen Studentenausschüsse aller deutschen Hochschulen einschließlich Danzigs, Österreichs sowie der ehemals deutschen Hochschulen in der Tschechoslowakei. Ursprünglich gegründet als demokratische Interessenvertretung, geriet die DSt bereits Anfang der 1920er Jahre in schwere innere Auseinandersetzungen zwischen republikanischer Minderheit und völkischem Mehrheitsflügel. Seit 1931 vom NS-Studentenbund dominiert, wurde die DSt 1936 faktisch mit ihm zusammengelegt und schließlich 1945 als NS-Organisation verboten" +
            "Tausende von Studenten huldigen Bismarck zum 80. Geburtstag am 1. April 1895" +
            "Von den Zeitgenossen wurde dieser erste studentische Dachverband auf deutschem Boden als die „Gestalt gewordene Sehnsucht eines Jahrhunderts deutschen Studententums“ gefeiert. Denn obwohl bereits die Urburschenschaft den Zusammenschluss aller Studenten zu einer einheitlichen Organisation erstrebt hatte und es auch später mehrfach Ansätze zu gemeinsamen Vertretungen gab, blieb die deutsche Studentenschaft das gesamte 19. Jahrhundert hindurch in zahlreiche konkurrierende Verbindungen und Verbände zersplittert. Allerdings erhoben einige dieser Verbände – allen voran die national gesinnten Burschenschaften und Vereine Deutscher Studenten – häufig den Anspruch, für die deutsche Studentenschaft als Ganzes zu sprechen, etwa bei den zahlreichen von ihnen initiierten Bismarck-Ehrungen." +
            "Gegen diesen Alleinvertretungsanspruch regte sich seit den 1890er Jahren der Widerstand der nicht-korporierten Studenten, die sich in Freistudentenschaften zusammenschlossen und nach langen Auseinandersetzungen mit Verbindungen und Hochschulbehörden schließlich die Bildung gemeinsamer Vertretungen in Gestalt der Allgemeinen Studentenausschüsse durchsetzten. Zur Gründung einer Gesamtvertretung auf nationaler Ebene kam es aber vor dem Ersten Weltkrieg nicht mehr." +
            "Demokratische Ansätze und solidarische Selbsthilfe",
        ),
      );
    }*/
  });
}

if (buttonPromptApi) {
  /*buttonPromptApi.addEventListener("click", async () => {
    console.log("Button clicked");
    const availability = await LanguageModel.availability();
    console.log(availability);
    if (availability === "unavailable") {
      alert("Model not available");
      return;
    }

    const params = await LanguageModel.params();
    console.log(params);

    const model = await LanguageModel.create({
      monitor(m) {
        m.addEventListener("downloadprogress", (e) => {
          console.log(`Downloaded ${e.loaded * 100}%`);
        });
      },
      initialPrompts: [
        {
          role: "system",
          content: "You are Jonny, a helpful and friendly assistant.",
        },
      ],
    });

    /!* const modelTwo = await LanguageModel.create({
      initialPrompts: [
        {
          role: "system",
          content: "You are Felix, a helpful and friendly assistant.",
        },
      ],
    });*!/

    console.log("Who are you?");
    console.log(await model.prompt("Who are you?"));
    console.log("Whats your favourite color?");
    console.log(await model.prompt("Whats your favourite color?"));

    const modelTwo = await LanguageModel.create({
      temperature: 2,
      initialPrompts: [
        {
          role: "system",
          content: "You are Felix, a helpful and friendly assistant.",
        },
      ],
    });

    const stream = modelTwo.promptStreaming("Write me an extra-long poem!");
    for await (const chunk of stream) {
      console.log(chunk);
    }

    /!* console.log("MODEL TWO");
    for (let i = 1; i <= 100; ++i) {
      console.log(i);
      console.log(
        await modelTwo.prompt(
          "Explain this: Die Deutsche Studentenschaft (DSt) war von 1919 bis 1945 der Zusammenschluss der Allgemeinen Studentenausschüsse aller deutschen Hochschulen einschließlich Danzigs, Österreichs sowie der ehemals deutschen Hochschulen in der Tschechoslowakei. Ursprünglich gegründet als demokratische Interessenvertretung, geriet die DSt bereits Anfang der 1920er Jahre in schwere innere Auseinandersetzungen zwischen republikanischer Minderheit und völkischem Mehrheitsflügel. Seit 1931 vom NS-Studentenbund dominiert, wurde die DSt 1936 faktisch mit ihm zusammengelegt und schließlich 1945 als NS-Organisation verboten" +
            "Tausende von Studenten huldigen Bismarck zum 80. Geburtstag am 1. April 1895" +
            "Von den Zeitgenossen wurde dieser erste studentische Dachverband auf deutschem Boden als die „Gestalt gewordene Sehnsucht eines Jahrhunderts deutschen Studententums“ gefeiert. Denn obwohl bereits die Urburschenschaft den Zusammenschluss aller Studenten zu einer einheitlichen Organisation erstrebt hatte und es auch später mehrfach Ansätze zu gemeinsamen Vertretungen gab, blieb die deutsche Studentenschaft das gesamte 19. Jahrhundert hindurch in zahlreiche konkurrierende Verbindungen und Verbände zersplittert. Allerdings erhoben einige dieser Verbände – allen voran die national gesinnten Burschenschaften und Vereine Deutscher Studenten – häufig den Anspruch, für die deutsche Studentenschaft als Ganzes zu sprechen, etwa bei den zahlreichen von ihnen initiierten Bismarck-Ehrungen." +
            "Gegen diesen Alleinvertretungsanspruch regte sich seit den 1890er Jahren der Widerstand der nicht-korporierten Studenten, die sich in Freistudentenschaften zusammenschlossen und nach langen Auseinandersetzungen mit Verbindungen und Hochschulbehörden schließlich die Bildung gemeinsamer Vertretungen in Gestalt der Allgemeinen Studentenausschüsse durchsetzten. Zur Gründung einer Gesamtvertretung auf nationaler Ebene kam es aber vor dem Ersten Weltkrieg nicht mehr." +
            "Demokratische Ansätze und solidarische Selbsthilfe",
        ),
      );
    }*!/
  });*/
}
