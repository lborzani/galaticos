export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class AdminRequiredError extends AppError {
  constructor() {
    super('Acesso negado: apenas administradores');
  }
}

export class EventNotFoundError extends AppError {
  constructor() {
    super('Evento não encontrado');
  }
}

export class RegistrationClosedError extends AppError {
  constructor() {
    super('As inscrições não estão abertas para este evento');
  }
}

export class AlreadyRegisteredError extends AppError {
  constructor() {
    super('Você já está inscrito neste evento');
  }
}

export class RegistrationNotFoundError extends AppError {
  constructor() {
    super('Inscrição não encontrada');
  }
}

export class RegistrationCancelledError extends AppError {
  constructor() {
    super('Inscrição cancelada');
  }
}

export class EventCancelledError extends AppError {
  constructor() {
    super('Evento cancelado');
  }
}

export class PassportNotFoundError extends AppError {
  constructor() {
    super('Passaporte não encontrado');
  }
}

export class TeamNotFoundError extends AppError {
  constructor() {
    super('Time não encontrado');
  }
}

export class InviteAlreadySentError extends AppError {
  constructor() {
    super('Este jogador já foi convidado para esse time');
  }
}

export class InviteNotFoundError extends AppError {
  constructor() {
    super('Convite não encontrado');
  }
}

export class InviteNotPendingError extends AppError {
  constructor() {
    super('Convite não está mais pendente');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Ação não autorizada para este usuário') {
    super(message);
  }
}
