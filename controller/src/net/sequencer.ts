export class Sequencer {
  private currentQ = 0;

  public next(): number {
    this.currentQ += 1;
    return this.currentQ;
  }

  public current(): number {
    return this.currentQ;
  }

  public reset(): void {
    this.currentQ = 0;
  }
}

