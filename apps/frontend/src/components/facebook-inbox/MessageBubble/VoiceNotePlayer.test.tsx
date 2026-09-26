import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { VoiceNotePlayer } from "./VoiceNotePlayer";

describe("VoiceNotePlayer", () => {
  beforeEach(() => {
    window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = jest.fn();
    window.HTMLMediaElement.prototype.load = jest.fn();
  });

  it("renders with initial play button and timestamps", () => {
    render(
      <VoiceNotePlayer
        src="https://maxp.online/uploads/chat-media/2026-09-26/sample.mp4"
        messageId="msg-123"
        isCustomer={true}
      />
    );

    const playBtn = screen.getByLabelText("تشغيل الصوت");
    expect(playBtn).toBeInTheDocument();
    expect(screen.getByText(/0:00/)).toBeInTheDocument();
  });

  it("cleans legacy /webhooks/uploads/ URL in audio src", () => {
    const { container } = render(
      <VoiceNotePlayer
        src="https://maxp.online/webhooks/uploads/chat-media/2026-09-26/sample.mp4"
        messageId="msg-123"
      />
    );

    const audio = container.querySelector("audio");
    expect(audio?.getAttribute("src")).toBe(
      "https://maxp.online/uploads/chat-media/2026-09-26/sample.mp4"
    );
  });

  it("triggers play and broadcasts stop-other-audios event on tap", async () => {
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");

    render(
      <VoiceNotePlayer
        src="https://maxp.online/uploads/chat-media/2026-09-26/sample.mp4"
        messageId="msg-123"
      />
    );

    const playBtn = screen.getByLabelText("تشغيل الصوت");
    await React.act(async () => {
      fireEvent.click(playBtn);
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "maxp:stop-other-audios",
        detail: { id: "msg-123" },
      })
    );
  });

  it("cycles playback rate when speed button is clicked", () => {
    render(
      <VoiceNotePlayer
        src="https://maxp.online/uploads/chat-media/2026-09-26/sample.mp4"
        messageId="msg-123"
      />
    );

    const speedBtn = screen.getByTitle("تغيير سرعة التشغيل");
    expect(speedBtn).toHaveTextContent("1x");

    fireEvent.click(speedBtn);
    expect(speedBtn).toHaveTextContent("1.5x");

    fireEvent.click(speedBtn);
    expect(speedBtn).toHaveTextContent("2x");

    fireEvent.click(speedBtn);
    expect(speedBtn).toHaveTextContent("1x");
  });
});
