import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { StepperModule } from 'primeng/stepper';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { InputTextModule } from 'primeng/inputtext';

@Component({
    selector: 'app-cadastro',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        ButtonModule, 
        PasswordModule, 
        StepperModule, 
        ToggleButtonModule, 
        InputTextModule
    ],
    templateUrl: './cadastro.html',
    styles: []
    
})
export class CadastroComponent {
    activeStep = 1;
    // activeStep: number = 1;
    
    // // Dados do formulário
    // name: string | null = null;
    // email: string | null = null;
    // password: string | null = null;
    
    // // Opções de interesses
    // option1: boolean = false;
    // option2: boolean = false;
    // option3: boolean = false;
    // option4: boolean = false;
    // option5: boolean = false;
    // option6: boolean = false;
    // option7: boolean = false;
}