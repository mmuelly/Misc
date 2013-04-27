# MIPS Calculator

.data
v:    	.asciiz "0123456789ABCDEF"	# string of ascii chracters we will use
equal:   .asciiz "="
plus:   .asciiz "+"
minus:  .asciiz "-"
times:  .asciiz "*"
print:  .asciiz "p"
exp: 	.space 128 		       	# memory to store input string
input:  .asciiz "\nInput: "
welcome: .asciiz "\n\nWelcome to the calculator.\nPlease enter a number, +, *, or p\n"
newline:  .asciiz "\n"
total:  .asciiz "\nTotal: "
fullerr:  .asciiz "\n\nThe stack is full\n\n"
output:  .asciiz "\n\nBase    Output\n--------------"
space:  .asciiz "    "
space2:  .asciiz "     "
prehex:  .asciiz "0x"

.text
.globl main
main:
       	li $s0, 0xa                     #load end-of-line into $s0
	la $a0, welcome			#print welcome message
	li $v0, 4
	syscall
	add $t5, $zero, $zero		#set stack counter $t5 = 0
begin:
	addi $s5, $zero, 1		#counts 1s, 10s, 100s, etc.
	add $t4, $zero, $zero		#setup stack counter $t4
	add $s1, $zero, $zero		#setup get number counter $s1
	add $s3, $zero, $zero		#set $s3 = 0
	add $s4, $zero, $zero		#saves actual number
	add $s7, $zero, $zero		#set byte counter $s7 = 0
	addi $t9, $zero, 10		#used to multiply by tens
	la $a0, input			#ask for input
	li $v0, 4
	syscall
	li $v0, 8
	li $a1, 127 			#maximum size for input expression
	la $a0, exp
	syscall				#read input expression into exp
	la $t0, exp            		#prepare to access characters in exp
	la $t1, plus           		#prepare to access a character in v
	lb $t3, 0($t1)			#load "+" ascii into a register
	lb $t2, 0($t0)			#load next array element
	beq $t2, $t3, plusop		#if it's a "+", go to 'plusop'
	la $t1, times          		#prepare to access a character in v
	lb $t3, 0($t1)			#load "*" ascii into a register
	beq $t2, $t3, timesop		#if it's a "*", go to 'timesop'
	la $t1, print          		#prepare to access a character in v
	lb $t3, 0($t1)			#load "p" ascii into a register
	beq $t2, $t3, printop		#if it's a "p", go to 'printop'
	la $t1, minus          		#prepare to access a character in v
	lb $t3, 0($t1)			#load "-" ascii into a register $t3
	slti $t1, $t5, -60       	#check if stack is full
        bne $t1, $zero, full    	#jump to 'full' if stack is full
	bne $t2, $s0, stack		#jump to 'stack' if null (end of string)
	j begin				#loop to 'begin'

stack:
	lb $s2, 0($t0)			#load byte from $t0 to $s2
	beq $s2, $s0, stack3		#jump to stack3 if $s2 = end of string
	addi $t0, $t0, 1		#goto next byte location on $t0
	addi $s7, $s7, 1		#counter	
	j stack				#loop to 'stack'

stack3:
	sub $t0, $t0, 1
	addi $s1, $s1, 1		#counter
	lb $s3, 0($t0)			#load byte from $t0 to $s3
	beq $s3, $t3, negative		#jump to 'negative' if $s3 = "-"
	addi $s3, $s3, -48		#subtract 48 to account for ascii code
	mul $s3, $s5, $s3		#figures out 1s, 10s, 100s, etc.
	add $s4, $s4, $s3		#adds byte to actual number

stack4:
	beq $s7, $s1, push		#jump to 'push' if stack $s1 location = 0
	mul $s5, $s5, $t9		#increment by multiples of 10
	j stack3			#loop to 'stack3'

push:
	sub $sp, $sp, 4
	sw $s4, 0($sp)			#saves actual number to real stack
	sub $t5, $t5, 4			#counter
	j begin				#jumps to 'begin'

negative:
	add $t8, $s4, $zero		#negate number
	sub $s4, $s4, $t8
	sub $s4, $s4, $t8
	j stack4			#jump to 'stack4'

plusop: 
	la $a0, total			#pint string 'total'
	li $v0, 4
	syscall
	add $s4, $zero, $zero		#set number register = 0

plusloop:

	beq $zero, $t5, sum		#jump to 'sum' if stack counter = 0
	lw $a0, 0($sp)			#load number from stack
	li $v0, 1
	syscall 			#print number out
	add $s4, $s4, $a0		#add number to running total
	addi $t5, $t5, 4		#increment stack counter
	beq $zero, $t5, sum		#jump to 'sum' if stack counter = 0
	la $a0, plus			#print plus sign
	li $v0, 4
	syscall
	addi $sp, $sp, 4		#increment stack pointer
	j plusloop			#loop to 'plusloop'
sum:
	la $a0, equal			#print 'equal' string
	li $v0, 4
	syscall
	move $a0, $s4			#print the sum
	li $v0, 1
	syscall
	j push				#put the sum on the stack

timesop: 
	la $a0, total			#pint string 'total'
	li $v0, 4
	syscall
	addi $s4, $zero, 1		#set number register = 0

timesloop:
	beq $zero, $t5, product		#jump to 'product' if stack counter = 0
	lw $a0, 0($sp)			#load number from stack
	li $v0, 1
	syscall 			#print number out
	mul $s4, $s4, $a0		#multiply the running total by the number
	addi $t5, $t5, 4		#increment stack counter
	beq $zero, $t5, product		#jump to 'product' if stack counter = 0
	la $a0, times			#print times sign
	li $v0, 4
	syscall
	addi $sp, $sp, 4		#increment stack pointer
	j timesloop			#loop to 'timesloop'
product:
	la $a0, equal			#print 'equal' string
	li $v0, 4
	syscall
	move $a0, $s4			#print the product
	li $v0, 1
	syscall
	j push				#put the product on the stack

printop:   
	la $a0, output			#prints table for base and output
	li $v0, 4
	syscall

printloop:
	la $a0, newline			#this function prints the format for the base
	li $v0, 4			#and the result
	syscall
	la $a0, newline
	li $v0, 4
	syscall
	li $a0, 10
	li $v0, 1
	syscall
	la $a0, space
	li $v0, 4
	syscall
	lw $a0, 0($sp)
	li $v0, 1
	syscall
	la $a0, newline
	li $v0, 4
	syscall
	li $a0, 2
	li $v0, 1
	syscall	 
	la $a0, space2
	li $v0, 4
	syscall
	lw $a0, 0($sp)
	move $s3, $a0
	li $v0, 1
	add $s7, $zero, $zero
	addi $s4, $zero, 32
	move $s2, $s7


binary:
	sub $s1, $s1, 1			#decrement by 1
	sub $s4, $s4, 1			#decrement by 1
	srl $s7, $s3, $s4		#shift right logical by number in $s4
	andi $s7, $s7, 1		#AND shift result with 1
	move $a0, $s7			#print bit
	syscall
	bne $s4, $zero, binary		#loop to 'binary'
	la $a0, newline			#move to next line
	li $v0, 4
	syscall
	li $a0, 16			#print formatting to set up for hex conversion
	li $v0, 1
	syscall
	la $a0, space
	li $v0, 4
	syscall
	la $a0, prehex
	li $v0, 4
	syscall
	addi $s4, $zero, 1
	add $s3, $zero, $zero
	add $s6, $zero, $zero
	lw $t2, 0($sp)

	#Hex conversion doesn't work
hex:
	addi $t9, $zero, 4
	addi $s5, $zero, 2
	mul $s2, $s5, $s2
	sub $s2, $s2, 1			#setup $s2 as loop counter
	move $s5, $t2
hex2:
	addi $s4, $s4, 1
	mul $s6, $s2, $t9
	srl $s3 , $s5, $s6
	and $s3, $s3, 0xF
	la $a0, v
	add $s3, $a0, $s3
	#lb $a0, 0($s3)
	#li $v0, 1
	#syscall
	sub $s2, $s2, 1			#decrement counter
	bne $s4, 32, hex2		#loop to 'hex2' $s2 > 0
	addi $t5, $t5, 4		#increment counter
	beq $zero, $t5, exit		#exit if done
	addi $sp, $sp, 4		#increment stack pointer
	j printloop			#loop to 'printloop'

full:
	la $a0, fullerr			#print error message if stack has 16 numbers
	li $v0, 4
	syscall
	j begin				#loops back to input prompt

exit:	li $2, 10			#exit program
	syscall