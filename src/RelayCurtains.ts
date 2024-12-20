import { BusproClient } from './BusproClient';
import { Logger } from 'homebridge';

export class RelayCurtains {
  private deviceAddress: number;
  private configuredDuration: number; // Total time (in seconds) to fully open/close the curtain
  private busproClient: BusproClient;
  private log: Logger;
  private currentPosition: number; // 0 = fully closed, 100 = fully open
  private moving: boolean;

  constructor(deviceAddress: number, configuredDuration: number, busproClient: BusproClient, log: Logger) {
    this.deviceAddress = deviceAddress;
    this.configuredDuration = configuredDuration;
    this.busproClient = busproClient;
    this.log = log;
    this.currentPosition = 0; // Initialize to fully closed
    this.moving = false;
  }

  public setPosition(position: number): void {
    this.log.info(`Setting curtain position to ${position}%`);

    if (this.moving) {
      this.log.warn('Curtain is currently moving. Ignoring command.');
      return;
    }

    if (position === this.currentPosition) {
      this.log.info('Curtain is already at the requested position.');
      return;
    }

    if (position === 0) {
      this.closeCurtain();
    } else if (position === 100) {
      this.openCurtain();
    } else {
      this.moveCurtainToPosition(position);
    }
  }

  private openCurtain(): void {
    this.log.info('Opening curtain fully.');
    this.busproClient.sendOpenCommand(this.deviceAddress);
    this.setMovingState(100, this.configuredDuration);
  }

  private closeCurtain(): void {
    this.log.info('Closing curtain fully.');
    this.busproClient.sendCloseCommand(this.deviceAddress);
    this.setMovingState(0, this.configuredDuration);
  }

  private moveCurtainToPosition(position: number): void {
    const duration = this.calculateDuration(position);

    this.log.info(`Moving curtain to ${position}%. Estimated duration: ${duration} seconds.`);
    this.busproClient.sendMoveCommand(this.deviceAddress, position);

    this.setMovingState(position, duration);
  }

  private calculateDuration(targetPosition: number): number {
    const difference = Math.abs(targetPosition - this.currentPosition);
    return Math.round((difference / 100) * this.configuredDuration);
  }

  private setMovingState(targetPosition: number, duration: number): void {
    this.moving = true;

    setTimeout(() => {
      this.currentPosition = targetPosition;
      this.moving = false;
      this.log.info(`Curtain movement completed. Current position: ${this.currentPosition}%.`);
    }, duration * 1000);
  }

  private syncPosition(targetPosition: number): void {
    this.log.info(`Synchronizing position to ${targetPosition}% in HomeKit.`);
    this.currentPosition = targetPosition;
  }

  public stopCurtain(): void {
    if (this.moving) {
      this.log.info('Stopping curtain movement.');
      this.busproClient.sendStopCommand(this.deviceAddress);
      this.moving = false;
    } else {
      this.log.info('Curtain is not moving. Stop command ignored.');
    }
  }
}
