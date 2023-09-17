import { FastifyInstance } from "fastify";
import { z } from "zod";
import { OpenAIStream, streamToResponse } from "ai";
import { prisma } from "../lib/prisma";
import { openai } from "../lib/openai";

export async function generateAiCompletionRoute(app: FastifyInstance) {
  app.post("/ai/complete", async (req, reply) => {
    const bodySchema = z.object({
      videoId: z.string().uuid(),
      prompt: z.string(),
      temperature: z.number().min(0).max(1).default(0.5),
    });

    let phrase = "";

    const { videoId, prompt, temperature } = bodySchema.parse(req.body);

    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: videoId,
      },
    });

    if (!video.transcription) {
      return reply
        .status(400)
        .send({ error: "Video transcription was not generated yet." });
    }

    const promptMessage = prompt.replace(
      "{transcription}",
      video.transcription
    );

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k",
      stream: true,
      messages: [{ role: "user", content: promptMessage }],
      temperature,
    });

    for await (const part of response) {
      let message = part.choices[0].delta.content ?? "";
      phrase += message;
      console.clear();
      console.log(phrase);
    }

    return phrase;
  });
}



