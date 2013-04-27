# Computes Fibonacci numbers

	.data
inStr:	.asciiz	"Enter an integer: "
outStr:	.asciiz	"Result is: " 
bye:	.asciiz	"\nBye\n"
	
	.text
main:	li	$v0, 4		# execution starts here
	la	$a0, inStr
	syscall
	li	$v0, 5
	syscall
	move 	$a0, $v0
	jal 	func		# call func 
	move	$s0, $v0
	li	$v0, 4
	la	$a0, outStr
	syscall	
	move 	$a0, $s0	# print result
	li 	$v0, 1
	syscall
	la 	$a0, bye 
	li 	$v0, 4
	syscall
	li 	$v0, 10
	syscall			

func:	move 	$v0, $a0
	li	$t9, 2
	slt	$t8, $a0, $t9
	bne	$t8, $zero, done
	li 	$t0, 0
	li 	$v0, 1

loop:	add 	$t1, $t0, $v0
	move 	$t0, $v0
	move 	$v0, $t1
	addi	$a0, $a0, -1
	li	$t9, 1
	slt	$t8, $t9, $a0
	bne	$t8, $zero, loop
done:	jr 	$ra
